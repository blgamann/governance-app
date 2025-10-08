import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ethBalance, setEthBalance] = useState<string>('0');

  const updateBalance = useCallback(async (provider: BrowserProvider, address: string) => {
    try {
      const balance = await provider.getBalance(address);
      setEthBalance(formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error);
    }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      // Create fresh provider - no caching
      const createFreshProvider = () => new BrowserProvider(window.ethereum);

      const provider = createFreshProvider();
      setProvider(provider);

      // Check if already connected and get signer
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const signer = await provider.getSigner();
          setSigner(signer);
          await updateBalance(provider, accounts[0]);
        }
      });

      // Get current chain ID
      window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
        setChainId(chainId);
      });

      // Listen for account changes
      const handleAccountsChanged = async (accounts: string[]) => {
        // Recreate provider to avoid caching
        const newProvider = createFreshProvider();
        setProvider(newProvider);

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const signer = await newProvider.getSigner();
          setSigner(signer);
          await updateBalance(newProvider, accounts[0]);
        } else {
          setAccount(null);
          setSigner(null);
          setEthBalance('0');
        }
      };

      // Listen for chain changes
      const handleChainChanged = async (newChainId: string) => {
        setChainId(newChainId);

        // Recreate provider to avoid caching
        const newProvider = createFreshProvider();
        setProvider(newProvider);

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const signer = await newProvider.getSigner();
          setSigner(signer);
          await updateBalance(newProvider, accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [updateBalance]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);

      if (provider) {
        const signer = await provider.getSigner();
        setSigner(signer);
        await updateBalance(provider, accounts[0]);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (error: any) {
      // Chain not added yet
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
        }
      } else {
        console.error('Failed to switch to Sepolia:', error);
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setEthBalance('0');
  };

  const refreshBalance = useCallback(async () => {
    if (provider && account) {
      await updateBalance(provider, account);
    }
  }, [provider, account, updateBalance]);

  const isSepoliaNetwork = chainId === SEPOLIA_CHAIN_ID;

  return {
    account,
    chainId,
    provider,
    signer,
    isConnecting,
    isSepoliaNetwork,
    ethBalance,
    connectWallet,
    switchToSepolia,
    disconnect,
    refreshBalance,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
