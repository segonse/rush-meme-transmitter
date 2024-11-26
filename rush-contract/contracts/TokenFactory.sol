// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Token.sol";
import "hardhat/console.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract TokenFactory {
    struct memeToken {
        string name;
        string symbol;
        string description;
        string tokenImageUrl;
        uint fundingRaised;
        address tokenAddress;
        address creatorAddress;
    }

    address[] public memeTokenAddresses;
    address private owner;
    uint256 private feeAmount = 0;

    mapping(address => memeToken) public addressToMemeTokenMapping;

    uint constant MEMETOKEN_CREATION_PLATFORM_FEE = 0.5 ether; // 0.0001
    uint constant MEMECOIN_FUNDING_DEADLINE_DURATION = 10 days;
    uint constant MEMECOIN_FUNDING_GOAL = 90000 ether; // 24
    uint constant TRANSACTION_FEE = 5;
    uint constant TRANSACTION_FEE_PERMILLAGE = 1000;

    address constant UNISWAP_V2_FACTORY_ADDRESS =
        0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C;
    address constant UNISWAP_V2_ROUTER_ADDRESS =
        0xedf6066a2b290C185783862C7F4776A2C8077AD1;

    uint constant DECIMALS = 10 ** 18;
    uint constant MAX_SUPPLY = 1000000 * DECIMALS;
    uint constant INIT_SUPPLY = (20 * MAX_SUPPLY) / 100;

    // 0.000001, 725e5
    uint256 public constant INITIAL_PRICE = 0.003 ether; // First purchase of a single token initial price
    uint256 public constant M = 27375e7; // Growth rate (m), scaled to avoid precision loss

    constructor() {
        owner = msg.sender;
    }

    function createMemeToken(
        string memory name,
        string memory symbol,
        string memory imageUrl,
        string memory description
    ) public payable returns (address) {
        //should deploy the meme token, mint the initial supply to the token factory contract
        require(
            msg.value >= MEMETOKEN_CREATION_PLATFORM_FEE,
            "fee not paid for memetoken creation"
        );
        feeAmount += msg.value;

        Token ct = new Token(name, symbol, INIT_SUPPLY);
        address memeTokenAddress = address(ct);
        memeToken memory newlyCreatedToken = memeToken(
            name,
            symbol,
            description,
            imageUrl,
            0,
            memeTokenAddress,
            msg.sender
        );
        memeTokenAddresses.push(memeTokenAddress);
        addressToMemeTokenMapping[memeTokenAddress] = newlyCreatedToken;

        return memeTokenAddress;
    }

    function getAllMemeTokens() public view returns (memeToken[] memory) {
        memeToken[] memory allTokens = new memeToken[](
            memeTokenAddresses.length
        );
        for (uint i = 0; i < memeTokenAddresses.length; i++) {
            allTokens[i] = addressToMemeTokenMapping[memeTokenAddresses[i]];
        }
        return allTokens;
    }

    // Function to calculate the cost in wei for purchasing `tokensToBuy` starting from `currentSupply`
    function calculateCost(
        uint256 currentSupply,
        uint256 tokensToBuy,
        bool isBuy
    ) public pure returns (uint256, uint256) {
        // Cost formula: m * S0 * n + m * n^2 / 2 + b * n
        uint256 cost = (M * currentSupply * tokensToBuy) +
            (M * (tokensToBuy * tokensToBuy)) /
            2 +
            (INITIAL_PRICE * tokensToBuy); // Adjust for k scaling without dividing by zero

        uint256 fee = 0;
        if (isBuy) {
            fee = (cost * TRANSACTION_FEE) / TRANSACTION_FEE_PERMILLAGE;
            console.log("Transaction fee is(buy) ", fee);
            cost += fee;
        } else {
            fee = (cost * TRANSACTION_FEE) / TRANSACTION_FEE_PERMILLAGE;
            console.log("Transaction fee is(sale) ", fee);
        }

        return (cost, fee);
    }

    function buyMemeToken(
        address memeTokenAddress,
        uint tokenQty
    ) public payable returns (uint) {
        //check if memecoin is listed
        require(
            addressToMemeTokenMapping[memeTokenAddress].tokenAddress !=
                address(0),
            "Token is not listed"
        );

        Token memeTokenCt = Token(memeTokenAddress);

        // check purchase amount large than zero
        require(tokenQty > 0, "Purchase amount must large than zero");

        // check to ensure funding goal is not met
        require(
            addressToMemeTokenMapping[memeTokenAddress].fundingRaised <
                MEMECOIN_FUNDING_GOAL,
            "Funding has already been raised"
        );

        // check to ensure there is enough supply to facilitate the purchase
        uint currentSupply = memeTokenCt.totalSupply();
        console.log("Current supply of token is(buyBefore) ", currentSupply);
        console.log("Max supply of token is(buyBefore) ", MAX_SUPPLY);
        uint available_qty = MAX_SUPPLY - currentSupply;
        console.log("Qty available for purchase(buyBefore) ", available_qty);

        uint scaled_available_qty = available_qty / DECIMALS;
        uint tokenQty_scaled = tokenQty * DECIMALS;

        require(
            tokenQty <= scaled_available_qty,
            "Not enough available supply"
        );

        // calculate the cost for purchasing tokenQty tokens as per the exponential bonding curve formula
        uint currentSupplyScaled = (currentSupply - INIT_SUPPLY) / DECIMALS;
        (uint256 requiredEth, uint256 fee) = calculateCost(
            currentSupplyScaled,
            tokenQty,
            true
        );

        feeAmount += fee;

        console.log("ETH required for purchasing meme tokens is ", requiredEth);

        // check if user has sent correct value of eth to facilitate this purchase
        require(msg.value >= requiredEth, "Incorrect value of ETH sent");

        // Incerement the funding
        addressToMemeTokenMapping[memeTokenAddress].fundingRaised += (msg
            .value - fee);

        if (
            addressToMemeTokenMapping[memeTokenAddress].fundingRaised >=
            MEMECOIN_FUNDING_GOAL
        ) {
            // create liquidity pool
            address pool = _createLiquidityPool(memeTokenAddress);
            console.log("Pool address ", pool);

            // provide liquidity
            uint tokenAmount = INIT_SUPPLY;
            uint ethAmount = addressToMemeTokenMapping[memeTokenAddress]
                .fundingRaised;
            uint liquidity = _provideLiquidity(
                memeTokenAddress,
                tokenAmount,
                ethAmount
            );
            console.log("Uniswap provided liquidty ", liquidity);

            // burn lp token
            _burnLpTokens(pool, liquidity);
        }

        // mint the tokens
        memeTokenCt.mint(tokenQty_scaled, msg.sender);

        console.log(
            "User balance of the tokens is(buyAfter) ",
            memeTokenCt.balanceOf(msg.sender)
        );

        console.log(
            "New available qty(buyAfter) ",
            MAX_SUPPLY - memeTokenCt.totalSupply()
        );

        return 1;
    }

    function sellMemeToken(
        address memeTokenAddress,
        uint tokenQty
    ) public returns (uint) {
        require(
            addressToMemeTokenMapping[memeTokenAddress].tokenAddress !=
                address(0),
            "Token is not listed"
        );

        Token memeTokenCt = Token(memeTokenAddress);
        require(tokenQty > 0, "Sell amount must large than zero");

        // check to ensure funding goal is not met
        require(
            addressToMemeTokenMapping[memeTokenAddress].fundingRaised <
                MEMECOIN_FUNDING_GOAL,
            "Funding has already been raised"
        );

        uint tokenQty_scaled = tokenQty * DECIMALS;

        require(
            memeTokenCt.balanceOf(msg.sender) >= tokenQty_scaled,
            "Insufficient token balance"
        );

        (uint256 salePrice, uint256 fee) = calculateCost(
            (memeTokenCt.totalSupply() - INIT_SUPPLY - tokenQty_scaled) /
                DECIMALS,
            tokenQty,
            false
        );

        console.log("ETH price for sale meme tokens is ", salePrice);

        feeAmount += fee;

        uint payout = salePrice - fee; // deducting the trasaction fee

        // Incerement the funding
        addressToMemeTokenMapping[memeTokenAddress].fundingRaised -= salePrice;

        // Burn the meme token of user sold
        memeTokenCt.burn(msg.sender, tokenQty_scaled);

        // The amount will be paid to the user after deducting the trasaction fee
        (bool success2, ) = payable(msg.sender).call{value: payout}("");
        if (!success2) {
            console.log("ETH transfer failed");
        } else {
            console.log("ETH transfer successed");
        }

        console.log(
            "User balance of the tokens is(saleAfter) ",
            memeTokenCt.balanceOf(msg.sender)
        );
        console.log(
            "New available qty(saleAfter) ",
            MAX_SUPPLY - memeTokenCt.totalSupply()
        );
        console.log(
            "current funding is(saleAfter) ",
            addressToMemeTokenMapping[memeTokenAddress].fundingRaised
        );

        return 1;
    }

    function _createLiquidityPool(
        address memeTokenAddress
    ) internal returns (address) {
        IUniswapV2Factory factory = IUniswapV2Factory(
            UNISWAP_V2_FACTORY_ADDRESS
        );
        IUniswapV2Router02 router = IUniswapV2Router02(
            UNISWAP_V2_ROUTER_ADDRESS
        );
        address pair = factory.createPair(memeTokenAddress, router.WETH());
        return pair;
    }

    function _provideLiquidity(
        address memeTokenAddress,
        uint tokenAmount,
        uint ethAmount
    ) internal returns (uint) {
        Token memeTokenCt = Token(memeTokenAddress);
        memeTokenCt.approve(UNISWAP_V2_ROUTER_ADDRESS, tokenAmount);
        IUniswapV2Router02 router = IUniswapV2Router02(
            UNISWAP_V2_ROUTER_ADDRESS
        );
        (uint amountToken, uint amountETH, uint liquidity) = router
            .addLiquidityETH{value: ethAmount}(
            memeTokenAddress,
            tokenAmount,
            tokenAmount,
            ethAmount,
            address(this),
            block.timestamp
        );
        return liquidity;
    }

    function _burnLpTokens(
        address pool,
        uint liquidity
    ) internal returns (uint) {
        IUniswapV2Pair uniswapv2pairCt = IUniswapV2Pair(pool);
        uniswapv2pairCt.transfer(address(0), liquidity);
        console.log("Uni v2 tokens burnt");
        return 1;
    }

    function withdrawFee() external {
        if (msg.sender != owner) {
            revert("Not owner");
        }

        (bool success, ) = payable(owner).call{value: feeAmount}("");
        if (!success) {
            console.log("Withdraw failed");
        } else {
            feeAmount = 0;
        }
    }
}
