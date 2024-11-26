import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import "../App.css";
import TokenFactoryContract from "./TokenFactoryContract.json";
import tokenContract from "./TokenContract.json";
import NavBar from "./NavBar/NavBar";

const TokenDetail = () => {
  const { tokenAddress } = useParams();
  const location = useLocation();
  const { card } = location.state || {};

  const [owners, setOwners] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSupply, setTotalSupply] = useState("0");
  const [remainingTokens, setRemainingTokens] = useState("0");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [saleAmount, setsaleAmount] = useState("");
  const [cost, setCost] = useState("0");
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const navigate = useNavigate();

  const tokenDetails = card || {
    name: "Unknown",
    symbol: "Unknown",
    description: "No description available",
    tokenImageUrl: "https://via.placeholder.com/200",
    fundingRaised: "0 POL",
    creatorAddress: "0x0000000000000000000000000000000000000000",
  };

  const fundingRaised = parseFloat(
    tokenDetails.fundingRaised.replace(" POL", "")
  );

  // Constants
  const fundingGoal = 90000;
  const maxSupply = parseInt(800000);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ownersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=polygon&order=DESC`,
          {
            headers: {
              accept: "application/json",
              "X-API-Key": process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const ownersData = await ownersResponse.json();
        setOwners(ownersData.result || []);

        const transfersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/transfers?chain=polygon&order=DESC`,
          {
            headers: {
              accept: "application/json",
              "X-API-Key": process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const transfersData = await transfersResponse.json();
        setTransfers(transfersData.result || []);

        // Fetch total supply
        const provider = new ethers.JsonRpcProvider(
          process.env.REACT_APP_RPC_URL
        );
        const contract = new ethers.Contract(
          tokenAddress,
          tokenContract.abi,
          provider
        );

        const totalSupplyResponse = await contract.totalSupply();
        var totalSupplyFormatted =
          parseInt(ethers.formatUnits(totalSupplyResponse, "ether")) - 200000;
        setTotalSupply(parseInt(totalSupplyFormatted));

        // Calculate remaining tokens
        setRemainingTokens(maxSupply - totalSupplyFormatted);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenAddress, maxSupply]);

  // Calculate percentages for progress bars
  const fundingRaisedPercentage = (fundingRaised / fundingGoal) * 100;
  const totalSupplyPercentage = (remainingTokens / maxSupply) * 100;

  // Function to get cost of purchasing tokens
  const getCost = async (isBuy) => {
    if (!purchaseAmount && !saleAmount) return;

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.REACT_APP_RPC_URL
      );
      const contract = new ethers.Contract(
        process.env.REACT_APP_CONTRACT_ADDRESS,
        TokenFactoryContract.abi,
        provider
      );

      if (isBuy) {
        const [costInWei, feeInWei] = await contract.calculateCost(
          totalSupply,
          purchaseAmount,
          true
        );

        setCost(ethers.formatUnits(costInWei, "ether"));
        setIsBuyModalOpen(true);
      } else {
        const [costInWei, feeInWei] = await contract.calculateCost(
          totalSupply - saleAmount,
          saleAmount,
          false
        );

        setCost(ethers.formatUnits(costInWei - feeInWei, "ether"));
        setIsSaleModalOpen(true);
      }
    } catch (error) {
      console.error("Error calculating cost:", error);
    }
  };

  const getContractByUserWallet = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log(signer);
    const contract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ADDRESS,
      TokenFactoryContract.abi,
      signer
    );
    return contract;
  };

  // Function to handle purchase
  const handlePurchase = async () => {
    try {
      const contract = await getContractByUserWallet();

      const transaction = await contract.buyMemeToken(
        tokenAddress,
        purchaseAmount,
        {
          value: ethers.parseUnits(cost, "ether"),
        }
      );
      const receipt = await transaction.wait();

      console.log(`Transaction successful! Hash: ${receipt.hash}`);
      setIsBuyModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error during purchase:", error);
    }
  };

  const handleSale = async () => {
    try {
      const contract = await getContractByUserWallet();

      const transaction = await contract.sellMemeToken(
        tokenAddress,
        saleAmount
      );
      const receipt = await transaction.wait();

      console.log(`Transaction successful! Hash: ${receipt.hash}`);
      setIsSaleModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error during sale:", error);
    }
  };

  return (
    <div className="token-detail-container">
      <NavBar />

      <h3 className="start-new-coin" onClick={() => navigate("/")}>
        [go back]
      </h3>

      <div className="token-details-section">
        <div className="token-details">
          <h2>Token Detail for {tokenDetails.name}</h2>
          <img
            src={tokenDetails.tokenImageUrl}
            alt={tokenDetails.name}
            className="token-detail-image"
          />
          <p>
            <strong>Creator Address:</strong> {tokenDetails.creatorAddress}
          </p>
          <p>
            <strong>Token Address:</strong> {tokenAddress}
          </p>
          <p>
            <strong>Funding Raised:</strong> {tokenDetails.fundingRaised}
          </p>
          <p>
            <strong>Token Symbol:</strong> {tokenDetails.symbol}
          </p>
          <p>
            <strong>Description:</strong> {tokenDetails.description}
          </p>
        </div>

        <div className="right-column">
          <div className="progress-bars">
            <div className="progress-container">
              <p>
                <strong>Bonding Curve Progress:</strong> {fundingRaised} /{" "}
                {fundingGoal} POL
              </p>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${fundingRaisedPercentage}%` }}
                ></div>
              </div>
              <p>
                When the market cap reaches {fundingGoal} POL, all the liquidity
                from the bonding curve will be deposited into Uniswap, and the
                LP tokens will be burned. Progression increases as the price
                goes up.
              </p>
            </div>

            <div className="progress-container">
              <p>
                <strong>Remaining Tokens Available for Sale:</strong>{" "}
                {remainingTokens} / 800,000
              </p>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${totalSupplyPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="buy-tokens">
            <h3>Buy Tokens</h3>
            <input
              type="number"
              placeholder="Enter amount of tokens to buy"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="buy-input"
            />
            <button onClick={() => getCost(true)} className="buy-button">
              Purchase
            </button>
          </div>

          <div className="buy-tokens">
            <h3>Sale Tokens</h3>
            <input
              type="number"
              placeholder="Enter amount of tokens to sale"
              value={saleAmount}
              onChange={(e) => setsaleAmount(e.target.value)}
              className="buy-input"
            />
            <button onClick={() => getCost(false)} className="buy-button">
              Sale
            </button>
          </div>
        </div>
      </div>

      {isBuyModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h4>Confirm Purchase</h4>
            <p>
              Cost of {purchaseAmount} tokens: {cost} POL
            </p>
            <button onClick={handlePurchase} className="confirm-button">
              Confirm
            </button>
            <button
              onClick={() => setIsBuyModalOpen(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isSaleModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h4>Confirm Sale</h4>
            <p>
              Expect to get of {saleAmount} tokens: {cost} POL
            </p>
            <button onClick={handleSale} className="confirm-button">
              Confirm
            </button>
            <button
              onClick={() => setIsSaleModalOpen(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h3>Owners</h3>
      {loading ? (
        <p>Loading owners...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner Address</th>
              <th>Percentage of Total Supply(1000000)</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner, index) => (
              <tr key={index}>
                <td>{owner.owner_address}</td>
                <td>
                  {(ethers.formatEther(owner.balance) / (maxSupply + 200000)) *
                    100}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Transfers</h3>
      {loading ? (
        <p>Loading transfers...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>From Address</th>
              <th>To Address</th>
              <th>Value</th>
              <th>Transaction Hash</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer, index) => (
              <tr key={index}>
                <td>{transfer.from_address}</td>
                <td>{transfer.to_address}</td>
                <td>{transfer.value_decimal}</td>
                <td>
                  <a
                    style={{ color: "white" }}
                    href={`https://polygonscan.com//tx/${transfer.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {transfer.transaction_hash}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TokenDetail;
