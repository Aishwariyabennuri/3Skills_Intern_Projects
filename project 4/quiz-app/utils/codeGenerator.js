const { customAlphabet } = require('nanoid');

// No look-alike characters (0/O, 1/I) to keep codes easy to read aloud and type.
const alphabet = '346789ABCDEFGHJKLMNPQRTUVWXY';

const generateRoomCode = customAlphabet(alphabet, 6);

module.exports = { generateRoomCode };
