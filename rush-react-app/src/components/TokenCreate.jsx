import React, { useState, useCallback } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import TokenFactoryContract from "./TokenFactoryContract.json";
import { ethers } from "ethers";
import NavBar, { switchToPolygon } from "./NavBar/NavBar";
import { PinataSDK } from "pinata-web3";
// import { useDropzone } from "react-dropzone";

const TokenCreate = () => {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const navigate = useNavigate();

  const pinata = new PinataSDK({
    pinataJwt: process.env.REACT_APP_PINATA_JWT,
    pinataGateway: process.env.REACT_APP_PINATA_GATEWAY,
  });

  const uploadToIPFS = async (file) => {
    try {
      console.log(process.env.PINATA_JWT);
      const upload = await pinata.upload.file(file);
      const url = `https://aqua-immense-possum-858.mypinata.cloud/ipfs/${upload.IpfsHash}`;
      return url;
    } catch (error) {
      console.log("Error while uploading to IPFS: ", error);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (isImageFile(file) && isFileSizeValid(file)) {
        console.log(process.env.pinataJwt);
        const url = await uploadToIPFS(file);
        setImageUrl(url);
      } else {
        alert("Please select a valid image file (Max. 5MB)");
      }
    }
  };

  const isImageFile = (file) => {
    return file.type.startsWith("image/");
  };

  const isFileSizeValid = (file) => {
    return file.size <= 5 * 1024 * 1024; // 5MB
  };

  const handleCreate = async () => {
    if (!name || !ticker || !description) {
      return alert("Please fill in all fields");
    } else if (!imageUrl) {
      return alert("Please wait for image upload");
    }

    if (typeof window.ethereum === "undefined") {
      return alert("Please install MetaMask");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    await switchToPolygon(provider, window.ethereum);

    const newProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await newProvider.getSigner();
    // console.log(signer);
    const contract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ADDRESS,
      TokenFactoryContract.abi,
      signer
    );

    try {
      const transaction = await contract.createMemeToken(
        name,
        ticker,
        imageUrl,
        description,
        {
          value: ethers.parseUnits("0.5", "ether"),
        }
      );
      const receipt = await transaction.wait();

      console.log(`Transaction successful! Hash: ${receipt.hash}`);
      console.log("Creating token:", { name, ticker, description, imageUrl });
      navigate("/");
    } catch (error) {
      console.log("Error during creation:", error);
    }
  };

  return (
    <div className="app">
      <NavBar />

      <div className="token-create-container">
        <h3 className="start-new-coin" onClick={() => navigate("/")}>
          [go back]
        </h3>
        <p className="info-text">MemeCoin creation fee: 0.5 POL</p>
        <p className="info-text">
          Max supply: 1 million tokens. Initial mint: 200k tokens.
        </p>
        <p className="info-text">
          If funding target of 90000 POL is met, a liquidity pool will be
          created on Uniswap, and all LP tokens will be burned.
        </p>
        <div className="input-container">
          <input
            type="text"
            placeholder="Token Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Ticker Symbol"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="input-field"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
          />

          <input
            type="file"
            onChange={handleFileChange}
            className="input-field"
            accept="image/*"
          />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="upload img"
              style={{ width: "200px", height: "200px" }}
              className="token-create-image"
            />
          ) : (
            <small>Image will be uploaded into IPFS</small>
          )}

          <button className="create-button" onClick={handleCreate}>
            Create MemeToken
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenCreate;
