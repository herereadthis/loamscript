const {
    branch: BRANCH,
    release_version: VERSION
} = process.env;
const CREATE_PROD_RELEASE = process.env.create_prod_release === 'true';

const getBody = (sha, commitMessage, branch) => {
    return `
* Tag Verification
  * SHA: \`${sha}\`
  * Commit message: \`${commitMessage}\`
  * Branch: \`${branch}\`
    `;
};

const run = async ({github, context, core}) => {
    try {
        const {
            owner,
            repo
        } = context.repo;

        const commits = await github.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
            sha: BRANCH
        });

        const {
            sha,
            commit
        } = commits.data[0];

        let prerelease, name, tag_name;
        if (CREATE_PROD_RELEASE) {
            prerelease = false;
            name = `${VERSION} Production`;
            tag_name = `v${VERSION}-prod`;
        } else {
            prerelease = true;
            name = `${VERSION} Staging`;
            tag_name = `v${VERSION}-staging`;
        }

        await github.rest.repos.createRelease({
            owner,
            repo,
            tag_name,
            target_commitish: sha,
            name,
            body: getBody(sha, commit.message, BRANCH),
            prerelease
        });
    } catch (err) {
        core.setFailed(err.message);
        throw err;
    }
};

module.exports = run;
