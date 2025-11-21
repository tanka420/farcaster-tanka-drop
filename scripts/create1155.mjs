// scripts/create1155.mjs
import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { create1155 } from '@zoralabs/protocol-sdk';

async function main() {
  // 1. Đọc env
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const pk = process.env.DEPLOYER_PRIVATE_KEY;

  if (!pk) {
    throw new Error('Thiếu DEPLOYER_PRIVATE_KEY trong .env');
  }

  // 2. Tạo account + client viem
  const creatorAccount = privateKeyToAccount(`0x${pk}`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    chain: base,
    transport: http(rpcUrl),
    account: creatorAccount,
  });

  console.log('Deployer address:', creatorAccount.address);

  // 3. GỌI Zora SDK: tạo 1155 contract + token
  // TODO: Boss thay 2 URI dưới bằng metadata thật của mình
  const CONTRACT_METADATA_URI = 'ipfs://bafkreietawpf2lkwf53b2p6otmcjap4xis4kmjbnab7qyidnogcfsr47xm/contract.json';
  const TOKEN_METADATA_URI = 'ipfs://bafkreia3riu5optfsztw4ncec52a5gqcah5b5afbabey353wunffjioynm/metadata.json';

  const { parameters, contractAddress } = await create1155({
    contract: {
      name: 'Farcaster TANKA Pass',   // tên contract
      uri: CONTRACT_METADATA_URI,     // contract metadata
    },
    token: {
      tokenMetadataURI: TOKEN_METADATA_URI, // metadata của NFT
      // KHÔNG set pricePerToken => free mint (chỉ gas + protocol fee)
    },
    account: creatorAccount,
    publicClient,
  });

  console.log('New 1155 contract will be at:', contractAddress);

  // 4. Simulate & gửi transaction
  const { request } = await publicClient.simulateContract(parameters);
  console.log('Sending tx...');
  const hash = await walletClient.writeContract(request);
  console.log('Tx hash:', hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Tx status:', receipt.status);

  if (receipt.status !== 'success') {
    throw new Error('Deploy failed');
  }

  console.log('✅ Deployed Zora 1155 contract successfully!');
  console.log('👉 Contract address:', contractAddress);
  console.log('⚠️ Ghi lại address này để cấu hình vào miniapp.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
