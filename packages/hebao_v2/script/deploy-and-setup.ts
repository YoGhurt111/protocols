// run on arbitrum: npx hardhat run --network arbitrum scripts/deploy-and-setup.ts

import BN = require("bn.js");
import hre = require("hardhat");
import RLP from 'rlp'
import fs from "fs";
const ethers = hre.ethers;
import { newWalletImpl, newWalletFactoryContract } from "../test/commons";
import { signCreateWallet } from "../test/helper/signatureUtils";
import { deployWalletImpl, deployWalletFactory } from "./create2-deploy";
import { json } from "hardhat/internal/core/params/argumentTypes";


const gasLimit = 6000000;

async function newWallet(walletFactoryAddress: string, _salt?: number) {

    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();
    const salt = _salt ? _salt : new Date().getTime();
    const signature = signCreateWallet(
        walletFactoryAddress,
        ownerAddr,
        [],
        new BN(0),
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        new BN(0),
        salt
    );
    const walletConfig: any = {
        owner: ownerAddr,
        guardians: [],
        quota: 0,
        inheritor: ethers.constants.AddressZero,
        feeRecipient: ethers.constants.AddressZero,
        feeToken: ethers.constants.AddressZero,
        maxFeeAmount: 0,
        salt,
        signature: Buffer.from(signature.txSignature.slice(2), "hex")
    };

    const walletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).attach(walletFactoryAddress);

    const walletAddrComputed = await walletFactory.computeWalletAddress(
        ownerAddr,
        salt
    );
    console.log("walletAddrcomputed:", walletAddrComputed);

    const tx = await walletFactory.createWallet(walletConfig, 0, { gasLimit });
    // console.log("tx:", tx);
    const receipt = await tx.wait();
    console.log("receipt:", receipt);

    return walletAddrComputed;
}

async function newWalletFactory(owner: string) {
    const ERC1271Lib = await (await ethers.getContractFactory(
        "ERC1271Lib"
    )).deploy({ gasLimit: gasLimit });
    console.log("const ERC1271Lib = \"", ERC1271Lib.address, "\";");

    const ERC20Lib = await (await ethers.getContractFactory("ERC20Lib")).deploy({ gasLimit });
    console.log("const ERC20Lib = \"", ERC20Lib.address, "\";");

    const GuardianLib = await (await ethers.getContractFactory(
        "GuardianLib"
    )).deploy({ gasLimit });
    console.log("const GuardianLib = \"", GuardianLib.address, "\";");

    const InheritanceLib = await (await ethers.getContractFactory(
        "InheritanceLib"
    )).deploy({ gasLimit });
    console.log("const InheritanceLib = \"", InheritanceLib.address, "\";");

    const LockLib = await (await ethers.getContractFactory("LockLib", {
        libraries: {
            GuardianLib: GuardianLib.address
        }
    })).deploy({ gasLimit });
    console.log("const LockLib = \"", LockLib.address, "\";");

    const MetaTxLib = await (await ethers.getContractFactory("MetaTxLib", {
        libraries: {
            ERC20Lib: ERC20Lib.address
        }
    })).deploy({ gasLimit });
    console.log("const MetaTxLib = \"", MetaTxLib.address, "\";");

    const QuotaLib = await (await ethers.getContractFactory("QuotaLib")).deploy({ gasLimit });
    console.log("const QuotaLib = \"", QuotaLib.address, "\";");

    const RecoverLib = await (await ethers.getContractFactory("RecoverLib", {
        libraries: {
            GuardianLib: GuardianLib.address
        }
    })).deploy({ gasLimit });
    console.log("const RecoverLib = \"", RecoverLib.address, "\";");

    const UpgradeLib = await (await ethers.getContractFactory(
        "UpgradeLib"
    )).deploy({ gasLimit });
    console.log("const UpgradeLib = \"", UpgradeLib.address, "\";");

    const WhitelistLib = await (await ethers.getContractFactory(
        "WhitelistLib"
    )).deploy({ gasLimit });
    console.log("const WhitelistLib = \"", WhitelistLib.address, "\";");

    // goerli
    const ownerSetter = owner;
    const priceOracle = "0x" + "00".repeat(20);

    // mainnet
    // const ownerSetter = "0x86B1cDc04F51a955512115FBc21Cc4AA912Ebb63";
    // const priceOracle = "0xb124190942976431d8181fbe183e44584253da68";

    const smartWallet = await (await ethers.getContractFactory("SmartWallet", {
        libraries: {
            ERC1271Lib: ERC1271Lib.address,
            // ERC1271Lib: "0xb1Bc5955AF5E733aE507c22ea46c2d0982091005",
            ERC20Lib: ERC20Lib.address,
            GuardianLib: GuardianLib.address,
            // GuardianLib: "0xB1983B05A8E6CC8D7d4898A50ea21516227CA427",
            InheritanceLib: InheritanceLib.address,
            // InheritanceLib: "0x0a77AD467BBf9803fbF9228C56e31a9EC64A1d7e",
            LockLib: LockLib.address,
            // LockLib: "0x295C5922051cEC70D19c8c50878165DEB628C1FA",
            MetaTxLib: MetaTxLib.address,
            // MetaTxLib: "0xE64D2E6d65833E1c94144e55eC56f1aaAC766cEE",
            QuotaLib: QuotaLib.address,
            // QuotaLib: "0x56F7be8dfB011697Df6Cea49d0726B653e04b5E3",
            RecoverLib: RecoverLib.address,
            // RecoverLib: "0x2e530AF33a42Beccc3986a660c4D4cDA7Fbcba43",
            UpgradeLib: UpgradeLib.address,
            // UpgradeLib: "0x191670B3EEd12e6cc9a36B38Fe288dd0703Cd075",
            WhitelistLib: WhitelistLib.address
            // WhitelistLib: "0x2f3AE8c7FA985d0c9CbD2dbA16a48C86C963D472"
        }
    })).deploy(priceOracle, ownerSetter, { gasLimit });
    console.log("const SmartWallet = \"", smartWallet.address, "\";");

    const implementationManager = await (await ethers.getContractFactory(
        "DelayedImplementationManager"
    )).deploy(smartWallet.address, { gasLimit });
    console.log("const DelayedImplementationManager = \"", implementationManager.address, "\";");

    const forwardProxy = await (await ethers.getContractFactory(
        "ForwardProxy"
    )).deploy(implementationManager.address, { gasLimit });
    console.log("const ForwardProxy = \"", forwardProxy.address, "\";");

    // const WalletFactory = await (await ethers.getContractFactory(
    //     "WalletFactory"
    // )).deploy(smartWallet.address, { gasLimit });
    const WalletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).deploy(forwardProxy.address, { gasLimit });
    console.log("const WalletFactory = \"", WalletFactory.address, "\";");
    console.log("masterCopy:", smartWallet.address);


    // return "0xC67107500077787edA336EE4A4C3146fd10B27fc";
    return await WalletFactory.deployed();
}



async function verifyWalletFactory() {
    const ownerAddr = "0xd54f3bDe60B73614905BA3881954d9FeB2476360";
    const ERC1271Lib = "0x18cFE847d4ca31bCDb4A3a23d5a99C313a41e424";
    const ERC20Lib = "0xa9aBC45A98AC6f5BD44944BAbB425EF480AbD3Fe";
    const GuardianLib = "0x9b1270Fe4D22d9051b8d5dceb7B32f6A8Ab4DFCF";
    const InheritanceLib = "0xF38605b5cc6324215adC11607D52dB0D1093Adb7";
    const LockLib = "0xc369C7F2d7DD35023a74c6FFe09AFfcB09E50583";
    const MetaTxLib = "0xF5D3ec68826e4774d214c6a515F85bEbC7C07874";
    const QuotaLib = "0x5f0594D3E3E279d63Bb73DE95578B0F4b59e80D4";
    const RecoverLib = "0x84ade1D4F8C4e35027Cbcfa73E91139F7600FD16";
    const UpgradeLib = "0xB4De0305D9e8670B9F045c5045AF03A121fAb5AD";
    const WhitelistLib = "0x6456Ab7259BFC51CC20609A8a733fFb49e97a4d8";
    const SmartWallet = "0xdf7E7f110E76449F217e799692eb8EB11B4F5557";
    const DelayedImplementationManager = "0x93cC2B5ABDa1830E9AcaDE3CB76E22D3082BFAe5";
    const ForwardProxy = "0x23a19a97A2dA581e3d66Ef5Fd1eeA15024f55611";
    const WalletFactory = "0x25abB7Ebf215C9fbc422B4B4550C77Ad2609BaE1";

    // goerli
    const ownerSetter = ownerAddr;
    const priceOracle = "0x" + "00".repeat(20);

    // mainnet
    // const ownerSetter = "0x86B1cDc04F51a955512115FBc21Cc4AA912Ebb63";
    // const priceOracle = "0xb124190942976431d8181fbe183e44584253da68";

    await hre.run("verify:verify", {
        address: ERC1271Lib
    });

    await hre.run("verify:verify", {
        address: ERC20Lib
    });

    await hre.run("verify:verify", {
        address: GuardianLib
    });

    await hre.run("verify:verify", {
        address: InheritanceLib
    });

    await hre.run("verify:verify", {
        address: LockLib,
        libraries: {
            GuardianLib: GuardianLib
        }
    });

    await hre.run("verify:verify", {
        address: MetaTxLib,
        libraries: {
            ERC20Lib: ERC20Lib
        }
    });

    await hre.run("verify:verify", {
        address: QuotaLib
    });

    await hre.run("verify:verify", {
        address: RecoverLib,
        libraries: {
            GuardianLib: GuardianLib
        }
    });

    await hre.run("verify:verify", {
        address: UpgradeLib
    });

    await hre.run("verify:verify", {
        address: WhitelistLib
    });

    await hre.run("verify:verify", {
        address: SmartWallet,
        constructorArguments: [
            priceOracle,
            ownerSetter
        ],
        libraries: {
            ERC1271Lib: ERC1271Lib,
            ERC20Lib: ERC20Lib,
            GuardianLib: GuardianLib,
            InheritanceLib: InheritanceLib,
            LockLib: LockLib,
            MetaTxLib: MetaTxLib,
            QuotaLib: QuotaLib,
            RecoverLib: RecoverLib,
            UpgradeLib: UpgradeLib,
            WhitelistLib: WhitelistLib
        }
    });

    await hre.run("verify:verify", {
        address: DelayedImplementationManager,
        constructorArguments: [
            SmartWallet
        ]
    });

    await hre.run("verify:verify", {
        address: ForwardProxy,
        constructorArguments: [
            DelayedImplementationManager
        ]
    });

    await hre.run("verify:verify", {
        address: WalletFactory,
        constructorArguments: [
            ForwardProxy
        ]
    });
    // await hre.run("verify:verify", {
    //     address: WalletFactory,
    //     constructorArguments: [
    //         SmartWallet
    //     ]
    // });
}

async function addManager(contractAddr: string, manager: string) {
    const managableContract = await (await ethers.getContractFactory(
        "OwnerManagable"
    )).attach(contractAddr);
    await managableContract.addManager(manager);

    const isManager = await managableContract.isManager(manager);
    console.log("isManager:", isManager);
}

async function deployPriceOracle() {
    const proxy = await (await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
    )).deploy({ gasLimit });
    console.log("priceOracle proxy address:", proxy.address);
}

// [20210729] deployed at arbitrum testnet: 0xd5535729714618E57C42a072B8d56E72517f3800 (proxy)
async function deployOfficialGuardian() {
    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();

    const proxy = await (await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
    )).deploy({ gasLimit });
    console.log("officialGuardian proxy address:", proxy.address);

    const officialGuardian = await (await ethers.getContractFactory(
        "OfficialGuardian"
    )).deploy({ gasLimit });
    console.log("officialGuardian address:", officialGuardian.address);

    await proxy.upgradeTo(officialGuardian.address);
    const proxyAsOfficialGuardian = await (await ethers.getContractFactory(
        "OfficialGuardian"
    )).attach(proxy.address);

    console.log("initOwner...");
    await proxyAsOfficialGuardian.initOwner(ownerAddr);
    const manager = "0xf6c53560e79857ce12dde54782d487b743b70717"
    await proxyAsOfficialGuardian.addManager(manager);
    // await proxyAsOfficialGuardian.addManager("0xC68B42a812569ab9458bde0af0F8C25A928E778f");
    console.log("add", manager, "as a manager");

    return proxy.address;
}

async function getWalletImplAddr(walletFactoryAddress: string) {
    const walletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).attach(walletFactoryAddress);

    const masterCopy = await walletFactory.walletImplementation();
    console.log("masterCopy:", masterCopy);
}

async function walletCreationTest() {
    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();

    console.log("const ownerAddr = \"", ownerAddr, "\";");
    const walletFactory = await newWalletFactory(ownerAddr);

    // await newWallet(walletFactory.address);

    // await getWalletImplAddr(walletFactory.address);
    const officialGuardianAddr = await deployOfficialGuardian();
    // await addManager(officialGuardianAddr, ownerAddr);
}

async function create2Test() {
    const smartWalletAddr = await deployWalletImpl();
    // // const walletFactoryAddr = await deployWalletFactory(smartWalletAddr);
    // const walletFactoryAddr = "0x5621a77f8EbC9265A60b0E83B49db998aC046B9C";
    // const newWalletAddr = await newWallet(walletFactoryAddr, 1629366091004);

    // console.log("newWalletAddr:", newWalletAddr);
}

async function rlpEncode() {
    const input = JSON.parse(fs.readFileSync("script/data/input.json", "ascii"));
    const str = JSON.stringify(input);
    const buf = Buffer.from(str);
    const length = RLP.encode(buf).byteLength;
    console.log("input length: ", length);
}

async function test() {
    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();
    // const create2DeployerByteCode = await (await ethers.getContractFactory(
    //     "LoopringCreate2Deployer"
    // )).bytecode;
    // console.log("create2DeployerByteCode:", create2DeployerByteCode);
    const create2Deployer = await (await ethers.getContractFactory(
        "LoopringCreate2Deployer"
    )).attach("0x64031F6B05CFee499705dD453036a5E37f8402E7");
    await create2Deployer.deploy("0x610777610026600b82828239805160001a60731461001957fe5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100355760003560e01c80637d631ea11461003a575b600080fd5b61004d6100483660046104ed565b610063565b60405161005a91906106ad565b60405180910390f35b600384015460009060ff161561007b575060006100af565b845461009f90849073ffffffffffffffffffffffffffffffffffffffff16846100b7565b156100ab5750826100af565b5060005b949350505050565b600073ffffffffffffffffffffffffffffffffffffffff83166100dc5750600061011d565b6100fb8373ffffffffffffffffffffffffffffffffffffffff16610124565b61010f5761010a84848461015b565b61011a565b61011a84848461029d565b90505b9392505050565b6000813f801580159061011d57507fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470141592915050565b600073ffffffffffffffffffffffffffffffffffffffff83166101805750600061011d565b815160411480610191575081516042145b6101d0576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101c7906106da565b60405180910390fd5b60008251604214156101e457506041825260015b6101ee85846103f7565b73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161491508161028a576000856040516020016102369190610606565b60405160208183030381529060405280519060200120905061025881856103f7565b73ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff16149250505b801561029557604283525b509392505050565b600080631626ba7e60e01b85846040516024016102bb929190610637565b604051602081830303815290604052907bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff838183161783525050505090506000808573ffffffffffffffffffffffffffffffffffffffff168360405161034291906105ea565b600060405180830381855afa9150503d806000811461037d576040519150601f19603f3d011682016040523d82523d6000602084013e610382565b606091505b5091509150818015610395575080516020145b80156103ec57507f1626ba7e000000000000000000000000000000000000000000000000000000006103c88260006104d1565b7fffffffff0000000000000000000000000000000000000000000000000000000016145b979650505050505050565b6000815160411461040a575060006104cb565b60208201516040830151604184015160ff167f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a082111561045057600093505050506104cb565b8060ff16601b148061046557508060ff16601c145b156104c3576001868285856040516000815260200160405260405161048d949392919061068f565b6020604051602081039080840390855afa1580156104af573d6000803e3d6000fd5b5050506020604051035193505050506104cb565b600093505050505b92915050565b600081600401835110156104e457600080fd5b50016020015190565b60008060008060808587031215610502578384fd5b843593506020808601357fffffffff0000000000000000000000000000000000000000000000000000000081168114610539578485fd5b935060408601359250606086013567ffffffffffffffff8082111561055c578384fd5b818801915088601f83011261056f578384fd5b81358181111561057b57fe5b604051847fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f84011682010181811084821117156105b657fe5b60405281815283820185018b10156105cc578586fd5b81858501868301379081019093019390935250939692955090935050565b600082516105fc818460208701610711565b9190910192915050565b7f19457468657265756d205369676e6564204d6573736167653a0a3332000000008152601c810191909152603c0190565b600083825260406020830152825180604084015261065c816060850160208701610711565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016919091016060019392505050565b93845260ff9290921660208401526040830152606082015260800190565b7fffffffff0000000000000000000000000000000000000000000000000000000091909116815260200190565b60208082526018908201527f494e56414c49445f5349474e41545552455f4c454e4754480000000000000000604082015260600190565b60005b8381101561072c578181015183820152602001610714565b8381111561073b576000848401525b5050505056fea26469706673582212203a2d1ff77c5fca9e10308a5d25c20ae8dd07ec8209ecb8c6b299f61073cbba3864736f6c63430007060033", 1);
}


async function main() {
    try {
        // await deployPriceOracle();
        // await walletCreationTest();
        // await verifyWalletFactory();
        // await create2Test();
        // await rlpEncode();
        await deployOfficialGuardian();
        // await addManager("0xEE41641603D5a1D6CF0947d2cF69e691Ba4Acc49", "0xd15953bd7cbcb36b69d4b9961b56f59cc2553d2e");
        // await test();
    } catch (e) {
        console.log(e.message);
        throw e;
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
