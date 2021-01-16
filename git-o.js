#!/usr/local/bin/node

const { exec } = require('child_process');
const { promisify } = require('util');

const execP = promisify(exec)

class Provider {
    constructor() {
        this.issues = null;
        this.pullrequests = null;
        this.pipelines = null;
    }

    get i() {
        return this.issues;
    }

    get pr() {
        return this.pullrequests;
    }

    get mergerequests() {
        return this.pullrequests;
    }

    get mr() {
        return this.pullrequests;
    }

    get p() {
        return this.pipelines;
    }
}

class GitLab extends Provider {
    constructor() {
        super();
        this.issues = '/issues';
        this.pullrequests = '/merge_requests';
        this.pipelines = '/pipelines';
    }
}

class GitHub extends Provider {
    constructor() {
        super();
        this.issues = '/issues';
        this.pullrequests = '/pulls';
        this.pipelines = '/actions';
    }
}

const providers = {
    'github.com': new GitHub(),
    'gitlab.com': new GitLab()
}

async function handleOpen(url) {
    let start = 'open'
    if (process.platform == 'darwin') start = 'open';
    else if (process.platform == 'win32') start = 'start';
    else {
        const kernelVersion = await execP('uname -r').then(({ stdout }) => stdout);
        if (kernelVersion.toLowerCase().includes('microsoft')) {
            start = 'powershell.exe Start';
        } else {
            start = 'xdg-open';
        }
    }
    execP(`${start} "${url}"`);
}

function showHelp() {
    console.log('git-o\n-----\n\n    Open your current git repo in the web (supporting GitHub and GitLab for now).\n    You can use the first argument to open a section of the web repo:\n     - pipelines / p: Open the CI section (only works for GitLab)    \n     - pullrequests / mergerequests / pr / mr: Open the PR/MR section    \n     - issues / i: Open the issues');
}

async function main(args) {
    const section = args[0] ? args[0].toLowerCase() : '';
    const branch = await execP('git rev-parse --abbrev-ref HEAD').then(({ err, stdout }) => {
        if (err) throw "There was a problem running git command";
        return stdout.trim();
    }).catch(() => { throw "There was a problem running git command" });
    const remoteUri = await execP('git remote get-url origin').then(({ err, stdout }) => {
        if (err) throw "There was a problem running git command";
        return stdout.trim();
    }).catch(() => { throw "There was a problem running git command" });
    let remoteHttp = ''
    if (remoteUri.startsWith('git@')) {
        remoteHttp = remoteUri.replace('git@', 'https://')
    }

    if (remoteHttp.endsWith('.git')) {
        remoteHttp = remoteHttp.replace('.git', '')
    }

    if (remoteHttp.match(/.+\..+:/)) {
        const groups = /(.+\..+):(.+)/.exec(remoteHttp)
        remoteHttp = `${groups[1]}/${groups[2]}`
    }

    const domain = /https?:\/\/([^\/]+\.[^\/]+)\//.exec(remoteHttp)[1];
    if (providers[domain] && providers[domain][section]) {
        await handleOpen(`${remoteHttp}${providers[domain][section]}`);
    } else if (branch === 'master') {
        await handleOpen(remoteHttp);
    } else {
        await handleOpen(`${remoteHttp}/tree/${branch}`);
    }
}

const args = process.argv.slice(2)
if (args[0] === '--help') showHelp();
else main(args).catch(console.error);
