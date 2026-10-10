const REPO_OWNER = 'ayhamone81-droid';
const REPO_NAME = 'tiktok-mobile';
const FILE_PATH = 'products.json';
const BRANCH = 'main';

exports.handler = async function(event, context) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return { statusCode: 500, body: JSON.stringify({ error: 'GitHub token not configured in Netlify' }) };
    }

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Netlify-Function'
    };

    if (event.httpMethod === 'GET') {
        try {
            const response = await fetch(url, { headers });
            if (response.status === 404) {
                return {
                    statusCode: 200,
                    body: JSON.stringify([])
                };
            }
            if (!response.ok) {
                const errText = await response.text();
                return { statusCode: response.status, body: errText };
            }
            const data = await response.json();
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: content
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }
    }

    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const products = body.products;

            // 1. جلب الـ SHA الحالي للملف
            let sha = null;
            const getRes = await fetch(url, { headers });
            if (getRes.ok) {
                const getData = await getRes.json();
                sha = getData.sha;
            }

            // 2. تحديث الملف عبر GitHub Contents API
            const contentEncoded = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
            const putBody = {
                message: 'Update products via admin panel',
                content: contentEncoded,
                branch: BRANCH
            };
            if (sha) {
                putBody.sha = sha;
            }

            const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putBody)
            });

            if (!putRes.ok) {
                const errText = await putRes.text();
                return { statusCode: putRes.status, body: errText };
            }

            const putData = await putRes.json();
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, commit: putData.commit.sha })
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
};
