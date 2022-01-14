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

    try {
        const tag_name = `v${version}`;

        const commits = (await github.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
            sha: BRANCH
        })).data;

        const tags = (await github.rest.repos.listTags({
            owner,
            repo,
            per_page: 5
        })).data;

        core.warning('tags');
        core.warning(tags);

        const tagExists = tags.some(tag => tag.name === tag_name);

        const releases = (await github.rest.repos.listReleases({
            owner,
            repo,
            per_page: 5
        })).data;

        core.warning('releases');
        core.warning(releases);

        // prodReleaseExists and preReleaseExists can both be false, e.g., no 
        // releases have been made for the tag. However, they cannot both be
        // true because 2 releases cannot be made against the same tag.
        const prodReleaseExists = releases.some(release => release.tag_name === tag_name && !release.prerelease);
        const preReleaseExists = releases.some(release => release.tag_name === tag_name && release.prerelease);

        if (tagExists && CREATE_PROD_RELEASE && prodReleaseExists) {
            core.setFailed(`tag ${tag_name} exists and production release already exists!`);
        } else if (tagExists && CREATE_PROD_RELEASE && preReleaseExists) {
            core.warning(`tag${tag_name} exists and prerelease exists. Update existing prerelease!`);
        } else if (tagExists && CREATE_PROD_RELEASE) {
            core.warning(`tag${tag_name} exists but no corresponding release exists. Create new production release!`);
        } else if (tagExists && preReleaseExists) {
            core.setFailed(`tag ${tag_name} exists and prerelease already exists!`);
        } else if (tagExists) {
            core.warning(`tag ${tag_name} exists but no corresponding prerelease exists. Create new prerelease!`);
        } else if (!tagExists && CREATE_PROD_RELEASE) {
            core.warning(`tag${tag_name} does not exist. Create new Production Release!`);
        } else {
            core.warning(`tag${tag_name} does not exist. Craete new Prerelease!`);
        }

        const {
            sha,
            commit,
            html_url: commitUrl
        } = commits[0];

        let prerelease, name;
        if (CREATE_PROD_RELEASE) {
            prerelease = false;
            name = `${version} Production`;
            // tag_name = `v${version}`;
        } else {
            prerelease = true;
            name = `${version} Staging`;
            // tag_name = `v${version}`;
        }

        await github.rest.repos.createRelease({
            owner,
            repo,
            tag_name,
            target_commitish: sha,
            name,
            body: getBody(sha, commit.message, commitUrl, BRANCH, releaseTemplate),
            prerelease
        });
    } catch (err) {
        core.setFailed(err.message);
        throw err;
    }
};

module.exports = run;
