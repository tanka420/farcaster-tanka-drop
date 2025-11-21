import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getTokensOfContract } from '@zoralabs/protocol-sdk';

const ZORA_1155_CONTRACT = '0xB51EB1a3FA71Ad0fEfDCC8A1A17821016bc4fc68';

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  console.log('Using contract:', ZORA_1155_CONTRACT);

  const { tokens, contract } = await getTokensOfContract({
    tokenContract: ZORA_1155_CONTRACT,
    publicClient,
  });

  console.log('Contract info from SDK:', contract);
  console.log('Mintable tokens length:', tokens.length);

  for (const t of tokens) {
    const tid =
      typeof t.token.tokenId === 'bigint'
        ? t.token.tokenId
        : BigInt(t.token.tokenId);

    console.log('---');
    console.log('tokenId:', tid.toString());
    console.log('mintType:', t.token.mintType);
    console.log('tokenURI:', t.token.tokenURI);
    console.log('maxSupply:', t.token.maxSupply?.toString?.());
    console.log('totalMinted:', t.token.totalMinted?.toString?.());
  }
}

main().catch((err) => {
  console.error('Error in debugMintable:', err);
  process.exit(1);
});
