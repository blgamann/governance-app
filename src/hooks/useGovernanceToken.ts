import { useState, useEffect, useCallback } from 'react';
import { Contract, formatUnits } from 'ethers';
import contractData from '../../contracts/GovernanceToken.json';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  balance: string;
}

export function useGovernanceToken(provider: any, signer: any, account: string | null) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const fetchTokenInfo = useCallback(async () => {
    if (!provider || !account) {
      setTokenInfo(null);
      return;
    }

    try {
      setLoading(true);
      const contract = new Contract(contractData.address, contractData.abi, provider);

      const [name, symbol, decimals, totalSupply, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.balanceOf(account),
      ]);

      setTokenInfo({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: formatUnits(totalSupply, decimals),
        balance: formatUnits(balance, decimals),
      });
    } catch (error) {
      console.error('Failed to fetch token info:', error);
    } finally {
      setLoading(false);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchTokenInfo();
  }, [fetchTokenInfo]);

  const exchange = async (pointAmount: number) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      setExchanging(true);
      const contract = new Contract(contractData.address, contractData.abi, signer);
      const tx = await contract.exchange(pointAmount);
      await tx.wait();

      // Refresh token info after successful exchange
      await fetchTokenInfo();

      return true;
    } catch (error) {
      console.error('Failed to exchange points:', error);
      throw error;
    } finally {
      setExchanging(false);
    }
  };

  return { tokenInfo, loading, exchanging, exchange, refreshTokenInfo: fetchTokenInfo };
}
