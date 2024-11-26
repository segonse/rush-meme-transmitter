const { expect } = require("chai");
const hre = require("hardhat");

describe("Token Factory", () => {
  it("Should create the memetoken successfully", async () => {
    const tokenFactoryCt = await hre.ethers.deployContract("TokenFactory");
    const tx = await tokenFactoryCt.createMemeToken(
      "Dogecoin",
      "DOGE",
      "This is a Doge Token",
      "image.png",
      { value: hre.ethers.parseEther("0.0001") }
    );
  });

  it("Should transact the memetoken successfully", async () => {
    const tokenFactoryCt = await hre.ethers.deployContract("TokenFactory");
    const tx = await tokenFactoryCt.createMemeToken(
      "Dogecoin",
      "DOGE",
      "This is a Doge Token",
      "image.png",
      { value: hre.ethers.parseEther("0.0001") }
    );

    const memeTokenAddress = await tokenFactoryCt.memeTokenAddresses(0);
    // const tx2 = await tokenFactoryCt.buyMemeToken(memeTokenAddress, 100000, {
    //   value: hre.ethers.parseEther("24"),
    // });
    const tx3 = await tokenFactoryCt.buyMemeToken(memeTokenAddress, 100, {
      value: hre.ethers.parseEther("23"),
    });

    const memeTokenCt = await hre.ethers.getContractAt(
      "Token",
      memeTokenAddress
    );
    // await memeTokenCt.scaleAmountApprove(tokenFactoryCt.getAddress(), 1000000);
    const tx5 = await tokenFactoryCt.sellMemeToken(memeTokenAddress, 100);

    const tx4 = await tokenFactoryCt.buyMemeToken(memeTokenAddress, 200000, {
      value: hre.ethers.parseEther("24"),
    });

    // const feeAmount = await tokenFactoryCt.getFeeAmount();
    // console.log("fee amount is: ", feeAmount);
  });
});
