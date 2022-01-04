const shell = require('shelljs');

const BRANCH = process.env.branch;
const CREATE_PROD_RELEASE = process.env.create_prod_release === 'true';

const getBody = (sha, commitMessage, branch) => {
    return `
* Tag Verification
  * SHA: ${sha}
  * Commit message: \`${commitMessage}\`
  * Branch: \`${branch}\`
    `;
};

const getAppVersion = () => {
    const currentVersion = shell.exec(`echo $(node -p -e "require('./package.json').version")`);
    return currentVersion.stdout.toString().trim();
};

const run = async ({github, context, core}) => {
    try {
        const version = getAppVersion();

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
            name = `${version} Production`;
            tag_name = `v${version}-prod`;
        } else {
            prerelease = true;
            name = `${version} Staging`;
            tag_name = `v${version}-staging`;
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