import React, { useState, useEffect } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import TopDog from "./TopDog/TopDog";
import TokenFactoryContract from "./TokenFactoryContract.json";
import { ethers } from "ethers";
import NavBar from "./NavBar/NavBar";

// TODO: The token with the highest amount raised should TOP DOG show

const App = () => {
  const [cards, setCards] = useState([]);
  const [cardsCopy, setCardsCopy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMemeTokens = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.REACT_APP_RPC_URL
        );

        // console.log(provider);
        const contract = new ethers.Contract(
          process.env.REACT_APP_CONTRACT_ADDRESS,
          TokenFactoryContract.abi,
          provider
        );

        const memeTokens = await contract.getAllMemeTokens();

        const items = memeTokens.map((token) => ({
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          tokenImageUrl: token.tokenImageUrl,
          fundingRaised: ethers.formatUnits(token.fundingRaised, "ether"), // Format the fundingRaised from Wei to Ether
          tokenAddress: token.tokenAddress,
          creatorAddress: token.creatorAddress,
        }));

        setCards(items.reverse());
        setCardsCopy(items);
      } catch (error) {
        console.error("Error fetching meme tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemeTokens();
  }, []);

  const handleSearch = () => {
    if (searchTerm) {
      const filteredCards = cardsCopy.filter(
        ({ name, symbol, description }) =>
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setCards(filteredCards);
    } else {
      setCards(cardsCopy);
    }
  };

  const navigateToTokenDetail = (card) => {
    navigate(`/token-detail/${card.tokenAddress}`, { state: { card } }); // Use tokenAddress for URL
  };

  return (
    <div className="app">
      <NavBar />

      <div className="card-container">
        <h3
          className="start-new-coin"
          onClick={() => navigate("/token-create")}
        >
          [Forge your meme coin]
        </h3>

        <TopDog />

        {cards.length > 0 && (
          <div
            className="card main-card"
            onClick={() => navigateToTokenDetail(cards[0])}
          >
            <div className="card-content">
              <img
                src={cards[0].tokenImageUrl}
                alt={cards[0].name}
                className="card-image"
              />
              <div className="card-text">
                <h2>Created by {cards[0].creatorAddress}</h2>
                <p>Funding Raised: {cards[0].fundingRaised} POL</p>
                <p>
                  {cards[0].name} (ticker: {cards[0].symbol})
                </p>
                <p>{cards[0].description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="search for token"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-button" onClick={handleSearch}>
            Search
          </button>
        </div>

        <h4 style={{ textAlign: "left", color: "rgb(134, 239, 172)" }}>
          Up to date
        </h4>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="card-list">
            {cards.slice(1).map((card, index) => (
              <div
                key={index + 1}
                className="card"
                onClick={() => navigateToTokenDetail(card)}
              >
                <div className="card-content">
                  <img
                    src={card.tokenImageUrl}
                    alt={card.name}
                    className="card-image"
                  />
                  <div className="card-text">
                    <h2>Created by {card.creatorAddress}</h2>
                    <p>Funding Raised: {card.fundingRaised} POL</p>
                    <p>
                      {card.name} (ticker: {card.symbol})
                    </p>
                    <p>{card.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
