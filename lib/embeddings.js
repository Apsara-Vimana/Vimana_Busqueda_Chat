/**
 * Embeddings desactivados (Hugging Face retirado del proyecto).
 */
function hasToken() { return false; }
async function getEmbedding() { return null; }
function cosineSimilarity() { return 0; }
module.exports = { getEmbedding, cosineSimilarity, hasToken };
