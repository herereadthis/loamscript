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
        const commits = await github.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
            sha: BRANCH
        });

        const tags = await github.rest.repos.listTags({
            owner,
            repo,
            per_page: 5
        });

        core.warning('tags');
        core.warning(tags.data);

        const releases = await github.rest.repos.listReleases({
            owner,
            repo,
            per_page: 5
        });

        core.warning('releases');
        core.warning(releases);

        const {
            sha,
            commit,
            html_url: commitUrl
        } = commits.data[0];

        const tag_name = `v${version}`;
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
