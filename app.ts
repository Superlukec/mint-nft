import 'dotenv/config'
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile, toBigNumber } from "@metaplex-foundation/js";
import Irys from "@irys/sdk";
import * as fs from 'fs';
import base58 from "bs58";

const QUICKNODE_RPC = process.env.RPC_NODE!;
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);
const WALLET = Keypair.fromSecretKey(base58.decode(process.env.WALLET as any));
const METAPLEX = Metaplex.make(SOLANA_CONNECTION)
    .use(keypairIdentity(WALLET))
    .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: QUICKNODE_RPC,
        timeout: 60000,
    }));

const CONFIG = {
    uploadPath: 'uploads/',
    creators: [
        { address: WALLET.publicKey, share: 100 }
    ]
};

const NFT_IMAGES = [
    {
        imgFileName: 'car1.png',
        imgName: 'Mitsubishi Blue',
        imgType: 'image/png',
        description: 'This is a blue Mitsubishi car',
        attributes: [
            { trait_type: 'Speed', value: 'Average' },
            { trait_type: 'Type', value: 'Common' },
        ],
        sellerFeeBasisPoints: 500,//500 bp = 5%
        symbol: 'QNPIY',
        creators: CONFIG.creators
    },
    {
        imgFileName: 'car2.png',
        imgName: 'Toyota Red',
        imgType: 'image/png',
        description: 'This is a red Toyota car',
        attributes: [
            { trait_type: 'Speed', value: 'Slow' },
            { trait_type: 'Type', value: 'Old' },
        ],
        sellerFeeBasisPoints: 500,//500 bp = 5%
        symbol: 'QNPIZ',
        creators: CONFIG.creators
    },
    {
        imgFileName: 'car3.png',
        imgName: 'Porsche Black',
        imgType: 'image/png',
        description: 'This is a black Porsche car',
        attributes: [
            { trait_type: 'Speed', value: 'Quick' },
            { trait_type: 'Type', value: 'Sport' },
            { trait_type: 'Boost', value: 'Nitro' }
        ],
        sellerFeeBasisPoints: 500,//500 bp = 5%
        symbol: 'QNPIX',
        creators: CONFIG.creators
    },
]

async function uploadImage(filePath: string, fileName: string): Promise<string> {
    console.log(`Step 1 - Uploading Image`);
    const imgBuffer = fs.readFileSync(filePath + fileName);
    const imgMetaplexFile = toMetaplexFile(imgBuffer, fileName);
    const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
    console.log(`   Image URI:`, imgUri);
    return imgUri;
}

async function uploadMetadata(imgUri: string, imgType: string, nftName: string, description: string, attributes: { trait_type: string, value: string }[]) {
    console.log(`Step 2 - Uploading Metadata`);
    const { uri } = await METAPLEX
        .nfts()
        .uploadMetadata({
            name: nftName,
            description: description,
            image: imgUri,
            attributes: attributes,
            properties: {
                files: [
                    {
                        type: imgType,
                        uri: imgUri,
                    },
                ]
            }
        });
    console.log('   Metadata URI:', uri);
    return uri;
}

async function mintNft(metadataUri: string, name: string, sellerFee: number, symbol: string, creators: { address: PublicKey, share: number }[]) {
    console.log(`Step 3 - Minting NFT`);
    const { nft } = await METAPLEX
        .nfts()
        .create({
            uri: metadataUri,
            name: name,
            sellerFeeBasisPoints: sellerFee,
            symbol: symbol,
            creators: creators,
            isMutable: false,
            maxSupply: toBigNumber(1)
        });
    console.log(`   Success!🎉`);
    console.log(`   Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`);
}

async function main() {
    for (const image of NFT_IMAGES) {
        console.log(`Minting ${image.imgName} to an NFT in Wallet ${WALLET.publicKey.toBase58()}`);
        // Step 1 - Upload Image
        const imgUri = await uploadImage(CONFIG.uploadPath, image.imgFileName);
        // Step 2 - Upload Metadata
        const metadataUri = await uploadMetadata(imgUri, image.imgType, image.imgName, image.description, image.attributes);
        // Step 3 - Mint NFT
        await mintNft(metadataUri, image.imgName, image.sellerFeeBasisPoints, image.symbol, image.creators);

        // set timeout to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

main();