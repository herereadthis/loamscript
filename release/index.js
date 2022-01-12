const {
    branch: BRANCH,
    release_type
} = process.env;
const CREATE_PROD_RELEASE = release_type === 'production';

async function loadFile(file) {
    let text = await file.text();
    return text;
}

const getBody = (sha, commitMessage, branch) => {
    return `
* Tag Verification
  * SHA: \`${sha}\`
  * Commit message: \`${commitMessage}\`
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

    if (template !== undefined) {
        const data = await loadFile(template);
        core.warning(data);
    }

    try {
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
