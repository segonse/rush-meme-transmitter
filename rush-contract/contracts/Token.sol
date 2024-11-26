// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address public owner;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 initialSupply
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, initialSupply);
        owner = msg.sender;
    }

    function mint(uint256 mintQty, address receiver) external returns (uint) {
        require(msg.sender == owner, "Mint can only be called by the owner");
        _mint(receiver, mintQty);
        return 1;
    }

    function burn(address account, uint256 burnQty) external returns (uint) {
        require(msg.sender == owner, "Burn can only be called by the owner");
        _burn(account, burnQty);
        return 1;
    }
}
