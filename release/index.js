const { countReset } = require('console');
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
  * SHA: \`${sha}\` ([link](${commitUrl}))
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
        core.warning('release');
        release = (await github.rest.repos.getReleaseByTag({
            owner,
            repo,
            tag: tag_name
        })).data;
        core.warning(release);
    } catch (err) {
        core.warning(err);
    }
    core.warning(`release exists: ${release !== undefined}`);

    try {

        const commits = (await github.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
            sha: BRANCH
        })).data;

        core.warning('tags');
        const tags = (await github.rest.repos.listTags({
            owner,
            repo,
            per_page: 10
        })).data;
        core.warning(tags);

        const tagExists = tags.some(tag => tag.name === tag_name);

        // prodReleaseExists and preReleaseExists can both be false if a) no 
        // releases have been made using the tag or b) the tag does not exist. 
        // However, they cannot both be true because 2 releases cannot be made 
        // using the same tag.
        const prodReleaseExists = release !== undefined && !release.prerelease;
        const preReleaseExists = release !== undefined && release.prerelease;
        let createNewRelease = false;
        let updateExistingRelease = false;

        if (prodReleaseExists) {
            core.warning('release exists');
            core.warning(release);
        }

        if (CREATE_PROD_RELEASE && tagExists && prodReleaseExists) {
            core.setFailed(`tag ${tag_name} exists and production release already exists!`);
        } else if (CREATE_PROD_RELEASE && tagExists && preReleaseExists) {
            core.warning(`tag ${tag_name} exists and prerelease exists. Update existing prerelease!`);
            updateExistingRelease = true;
        } else if (CREATE_PROD_RELEASE && tagExists) {
            core.warning(`tag ${tag_name} exists but no corresponding release exists. Create new production release!`);
            createNewRelease = true;
        } else if (CREATE_PROD_RELEASE) {
            core.warning(`tag ${tag_name} does not exist. Create new Production Release!`);
            createNewRelease = true;
        } else if (tagExists && preReleaseExists) {
            core.setFailed(`tag ${tag_name} exists and prerelease already exists!`);
        } else if (tagExists) {
            core.warning(`tag ${tag_name} exists but no corresponding prerelease exists. Create new prerelease!`);
            createNewRelease = true;
        } else {
            core.warning(`tag${tag_name} does not exist. Create new Prerelease!`);
            createNewRelease = true;
        }
        
        if (updateExistingRelease) {
            await github.rest.repos.updateRelease({
                owner,
                repo,
                release_id: release.id,
                name: `${version} ${CREATE_PROD_RELEASE ? 'Production' : 'Staging'}`,
                prerelease: !CREATE_PROD_RELEASE
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
        core.setFailed(err.message);
        throw err;
    }
};

module.exports = run;
