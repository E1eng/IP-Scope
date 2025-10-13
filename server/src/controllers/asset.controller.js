const storyProtocolService = require('../services/storyProtocol.service');

const getAssetsByOwnerController = async (req, res) => {
  try {
    const ownerAddress = req.params.address;
    console.log(`[CONTROLLER] Menerima permintaan untuk alamat: ${ownerAddress}`);
    const assets = await storyProtocolService.getAssetsByOwner(ownerAddress);
    res.status(200).json(assets);
  } catch (error) {
    console.error(`[CONTROLLER_ERROR] ${error.message}`);
    res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
  }
};

// Kita hanya ekspor satu controller ini
module.exports = {
  getAssetsByOwnerController,
};