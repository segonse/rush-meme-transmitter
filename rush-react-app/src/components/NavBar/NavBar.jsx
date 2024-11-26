import React from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

import Style from "./NavBar.module.css";

const switchToTargetChain = async (chainId, connection) => {
  try {
    await connection.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }], // 转为十六进制
    });
    console.log("Switched to target chain successfully");
  } catch (error) {
    // If the user's wallet does not have the chain, try adding the chain
    if (error.code === 4902) {
      try {
        await connection.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${chainId.toString(16)}`,
              chainName: "Polygon Mainnet",
              rpcUrls: [process.env.REACT_APP_RPC_URL], 
              nativeCurrency: {
                name: "POL",
                symbol: "POL",
                decimals: 18,
              },
              blockExplorerUrls: ["https://polygonscan.com"],
            },
          ],
        });

        console.log("The target chain has been added and switched");
      } catch (addError) {
        console.error("Failed to add chain: ", addError);
      }
    } else {
      console.error("Failed to switch chain: ", error);
    }
  }
};

const switchToPolygon = async (provider, connection) => {
  const network = await provider.getNetwork();
  const polygonChainId = 137; // Polygon Mainnet Chain ID
  console.log(
    "Current chain: ",
    Number(network.chainId),
    ", target chain: ",
    polygonChainId
  );
  if (Number(network.chainId) !== polygonChainId) {
    await switchToTargetChain(polygonChainId, connection);
  } else {
    console.log("The current chain ID matches Polygon Mainnet");
  }
};

const NavBar = () => {
  const connectWallet = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.BrowserProvider(connection);

    await switchToPolygon(provider, connection);

    const newprovider = new ethers.BrowserProvider(window.ethereum);
    const signer = await newprovider.getSigner();
    const address = await signer.getAddress();
    console.log("Current account: ", address);
  };

  return (
    <div className={Style.NavBar}>
      <nav className="navbar">
        <a
          href="https://github.com/segonse"
          target="_blank"
          className="nav-link"
          rel="noreferrer"
        >
          [segon]
        </a>
        <a href="#" className="nav-link">
          [docs]
        </a>
        <button className="nav-button" onClick={connectWallet}>
          [connect wallet]
        </button>
      </nav>
    </div>
  );
};

export default NavBar;
export { switchToPolygon };
