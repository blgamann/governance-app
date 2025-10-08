import { useState, useEffect, useCallback } from 'react';
import { Contract, formatUnits, JsonRpcProvider } from 'ethers';
import governanceData from '../../contracts/Governance.json';

interface Proposal {
  id: number;
  description: string;
  forVotes: string;
  againstVotes: string;
  endTime: number;
  executed: boolean;
  state: string;
  hasVoted: boolean;
}

export function useGovernance(provider: any, signer: any, account: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [executing, setExecuting] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!provider) {
      setProposals([]);
      return;
    }

    try {
      setLoading(true);

      // Use Alchemy RPC for reading to avoid MetaMask caching issues
      const rpcProvider = new JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
      const contract = new Contract(governanceData.address, governanceData.abi, rpcProvider);

      // Get total proposal count
      const count = await contract.proposalCount();
      const proposalCount = Number(count);

      console.log('Proposal count:', proposalCount);

      if (proposalCount === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // Fetch all proposals
      const proposalPromises = [];
      for (let i = proposalCount; i >= 1; i--) {
        console.log('Fetching proposal ID:', i);
        proposalPromises.push(
          Promise.all([
            contract.getProposal(i),
            contract.getProposalState(i),
            account ? contract.hasVoted(i, account) : Promise.resolve(false)
          ]).then(([proposalData, state, hasVoted]) => {
            console.log(`Proposal ${i} data:`, proposalData);
            console.log(`Proposal ${i} state:`, state);
            console.log(`Proposal ${i} hasVoted:`, hasVoted);
            return {
              id: i,
              description: proposalData[0],
              forVotes: formatUnits(proposalData[1], 18),
              againstVotes: formatUnits(proposalData[2], 18),
              endTime: Number(proposalData[3]),
              executed: proposalData[4],
              state: state,
              hasVoted: hasVoted
            };
          }).catch(error => {
            console.error(`Error fetching proposal ${i}:`, error);
            return null;
          })
        );
      }

      const fetchedProposals = (await Promise.all(proposalPromises)).filter(p => p !== null);
      console.log('Fetched proposals:', fetchedProposals);
      setProposals(fetchedProposals);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const updateProposal = useCallback(async (proposalId: number) => {
    if (!account) return;

    try {
      // Use Alchemy RPC for reading to avoid MetaMask caching issues
      const rpcProvider = new JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
      const contract = new Contract(governanceData.address, governanceData.abi, rpcProvider);

      const [proposalData, state, hasVoted] = await Promise.all([
        contract.getProposal(proposalId),
        contract.getProposalState(proposalId),
        contract.hasVoted(proposalId, account)
      ]);

      const updatedProposal: Proposal = {
        id: proposalId,
        description: proposalData[0],
        forVotes: formatUnits(proposalData[1], 18),
        againstVotes: formatUnits(proposalData[2], 18),
        endTime: Number(proposalData[3]),
        executed: proposalData[4],
        state: state,
        hasVoted: hasVoted
      };

      setProposals(prev =>
        prev.map(p => p.id === proposalId ? updatedProposal : p)
      );
    } catch (error) {
      console.error(`Failed to update proposal ${proposalId}:`, error);
    }
  }, [account]);

  const vote = async (proposalId: number, support: boolean) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      setVoting(true);
      const contract = new Contract(governanceData.address, governanceData.abi, signer);
      const tx = await contract.vote(proposalId, support);
      await tx.wait();

      // Update only the voted proposal instead of fetching all
      await updateProposal(proposalId);

      return true;
    } catch (error) {
      console.error('Failed to vote:', error);
      throw error;
    } finally {
      setVoting(false);
    }
  };

  const executeProposal = async (proposalId: number) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      setExecuting(true);
      const contract = new Contract(governanceData.address, governanceData.abi, signer);
      const tx = await contract.execute(proposalId);
      await tx.wait();

      // Update only the executed proposal instead of fetching all
      await updateProposal(proposalId);

      return true;
    } catch (error) {
      console.error('Failed to execute proposal:', error);
      throw error;
    } finally {
      setExecuting(false);
    }
  };

  return {
    proposals,
    loading,
    voting,
    executing,
    vote,
    executeProposal,
    refreshProposals: fetchProposals
  };
}
