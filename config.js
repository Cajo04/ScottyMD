require('dotenv').config();

global.APIs = {
    xteam: 'https://api.xteam.xyz',
    neoxr: 'https://api.neoxr.my.id',
};

global.APIKeys = {
    'https://api.xteam.xyz': 'd90a9e986e18778b',
    'https://api.neoxr.my.id': 'yourkey',
};

module.exports = {
    WARN_COUNT: 3,
    APIs: global.APIs,
    APIKeys: global.APIKeys
};
