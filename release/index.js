const fs = require('fs');

const {
    branch: BRANCH,
    release_type
} = process.env;
const CREATE_PROD_RELEASE = release_type === 'production';

const getBody = (sha, commitMessage, commitUrl, branch, template) => {
    return `
${template}

* Tag Verification
  * SHA ([link](${commitUrl})): \`${sha}\`
  * Commit message: \`${commitMessage.replace(/\n+/g, ' - ')}\`
  * Branch: \`${branch}\`
    `;
};

const run = async ({github, context, core, version, template}) => {
    const {
        owner,
        repo
    } = context.repo;

    if (version === undefined) {
        core.setFailed('Must provide package version');
    }

    let releaseTemplate = '';
    if (template !== undefined) {
        try {
            releaseTemplate = fs.readFileSync(template, {
                encoding:'utf8',
                flag:'r'
            });
        } catch (err) {
            core.setFailed('unable to read template file');
            throw err;
        }
    }

    const tag_name = `v${version}`;

    let release;
    try {
        release = (await github.rest.repos.getReleaseByTag({
            owner,
            repo,
            tag: tag_name
        })).data;
    } catch (err) {
        // Release already exists.
    }

    let commits, tags;
    try {
        commits = (await github.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
            sha: BRANCH
        })).data;

        tags = (await github.rest.repos.listTags({
            owner,
            repo,
            per_page: 10
        })).data;

        const tagExists = tags.some(tag => tag.name === tag_name);

        // prodReleaseExists and preReleaseExists can both be false if a) no 
        // releases have been made using the tag or b) the tag does not exist. 
        // However, they cannot both be true because 2 releases cannot be made 
        // using the same tag.
        const prodReleaseExists = release !== undefined && !release.prerelease;
        const preReleaseExists = release !== undefined && release.prerelease;
        let createNewRelease = false;
        let updateExistingRelease = false;

        if (CREATE_PROD_RELEASE && tagExists && prodReleaseExists) {
            core.setFailed(`tag ${tag_name} exists with release '${release.name}'!`);
        } else if (CREATE_PROD_RELEASE && tagExists && preReleaseExists) {
            core.info(`Tag ${tag_name} exists with prerelease '${release.name}'. Update existing prerelease.`);
            updateExistingRelease = true;
        } else if (CREATE_PROD_RELEASE && tagExists) {
            core.info(`Tag ${tag_name} exists with no corresponding release. Create new production release.`);
            createNewRelease = true;
        } else if (CREATE_PROD_RELEASE) {
            core.info(`Tag ${tag_name} does not exist. Create new tag and production release.`);
            createNewRelease = true;
        } else if (tagExists && prodReleaseExists) {
            core.setFailed(`Tag ${tag_name} exists with release '${release.name}'! Will not convert to prerelease.`);
        } else if (tagExists && preReleaseExists) {
            core.setFailed(`Tag ${tag_name} exists with prerelease '${release.name}'!`);
        } else if (tagExists) {
            core.info(`Tag ${tag_name} exists with no corresponding release. Create new prerelease.`);
            createNewRelease = true;
        } else {
            core.info(`Tag ${tag_name} does not exist. Create new tag and prerelease.`);
            createNewRelease = true;
        }
        
        if (updateExistingRelease) {
            // The only currently allowed update is converting a prerelease to a 
            // (production) release.
            await github.rest.repos.updateRelease({
                owner,
                repo,
                release_id: release.id,
                name: `${version} Production`,
                prerelease: false
            });
        }

        if (createNewRelease) {
            const {
                sha,
                commit,
                html_url: commitUrl
            } = commits[0];

            await github.rest.repos.createRelease({
                owner,
                repo,
                tag_name,
                target_commitish: sha,
                name: `${version} ${CREATE_PROD_RELEASE ? 'Production' : 'Staging'}`,
                body: getBody(sha, commit.message, commitUrl, BRANCH, releaseTemplate),
                prerelease: !CREATE_PROD_RELEASE
            });
        }
    } catch (err) {
        core.info('commits');
        core.tags(commits);
        core.info('tags');
        core.tags(tags);
        core.setFailed(err.message);
        throw err;
    }
};

module.exports = run;
