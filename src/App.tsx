import { useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { useGovernanceToken } from './hooks/useGovernanceToken'
import { useGovernance } from './hooks/useGovernance'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function App() {
  const {
    account,
    provider,
    signer,
    isConnecting,
    isSepoliaNetwork,
    ethBalance,
    connectWallet,
    switchToSepolia,
    disconnect,
    refreshBalance,
  } = useWallet()

  const { tokenInfo, loading, exchanging, exchange } = useGovernanceToken(provider, signer, account)
  const { proposals, loading: proposalsLoading, voting, proposing, vote, executeProposal, propose } = useGovernance(provider, signer, account)
  const [points, setPoints] = useState(0)
  const [swapAmount, setSwapAmount] = useState('')
  const [activeTab, setActiveTab] = useState<'exchange' | 'vote'>('exchange')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [proposalDescription, setProposalDescription] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }

  const handleGetPoints = () => {
    setPoints(prev => prev + 10)
  }

  const handleSwapToToken = async () => {
    const amount = parseInt(swapAmount)

    if (!swapAmount || amount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    if (amount > points) {
      showToast('Insufficient points', 'error')
      return
    }

    try {
      await exchange(amount)
      setPoints(prev => prev - amount) // Deduct exchanged points
      setSwapAmount('') // Clear input
      await refreshBalance() // Refresh ETH balance after transaction
      showToast(`Successfully exchanged ${amount} points to tokens!`, 'success')
    } catch (error: any) {
      console.error('Exchange failed:', error)

      let errorMessage = 'Failed to exchange points. '
      if (error?.message?.includes('user rejected')) {
        errorMessage += 'Transaction was rejected.'
      } else if (error?.message?.includes('insufficient funds')) {
        errorMessage += 'Insufficient ETH for gas fees.'
      } else {
        errorMessage += 'Please try again.'
      }

      showToast(errorMessage, 'error')
    }
  }

  const handleMaxPoints = () => {
    setSwapAmount(points.toString())
  }

  const outputTokenAmount = swapAmount ? parseInt(swapAmount) : 0

  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      await vote(proposalId, support)
      showToast(`Successfully voted ${support ? 'For' : 'Against'} proposal #${proposalId}`, 'success')
    } catch (error: any) {
      console.error('Vote failed:', error)
      let errorMessage = 'Failed to vote. '
      if (error?.message?.includes('user rejected')) {
        errorMessage += 'Transaction was rejected.'
      } else if (error?.message?.includes('Already voted')) {
        errorMessage += 'You have already voted on this proposal.'
      } else if (error?.message?.includes('Voting ended')) {
        errorMessage += 'Voting period has ended.'
      } else if (error?.message?.includes('No voting power')) {
        errorMessage += 'You need governance tokens to vote. Exchange points for tokens first.'
      } else {
        errorMessage += error?.message || 'Please try again.'
      }
      showToast(errorMessage, 'error')
    }
  }

  const handleExecute = async (proposalId: number) => {
    try {
      await executeProposal(proposalId)
      showToast(`Successfully executed proposal #${proposalId}`, 'success')
    } catch (error: any) {
      console.error('Execute failed:', error)
      showToast('Failed to execute proposal. ' + (error?.message || 'Please try again.'), 'error')
    }
  }

  const handleCreateProposal = async () => {
    if (!proposalDescription.trim()) {
      showToast('Please enter a proposal description', 'error')
      return
    }

    try {
      await propose(proposalDescription)
      showToast('Successfully created proposal!', 'success')
      setProposalDescription('')
      setShowCreateForm(false)
    } catch (error: any) {
      console.error('Create proposal failed:', error)
      let errorMessage = 'Failed to create proposal. '
      if (error?.message?.includes('user rejected')) {
        errorMessage += 'Transaction was rejected.'
      } else {
        errorMessage += error?.message || 'Please try again.'
      }
      showToast(errorMessage, 'error')
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Active': return 'text-blue-600 bg-blue-50'
      case 'Succeeded': return 'text-green-600 bg-green-50'
      case 'Defeated': return 'text-red-600 bg-red-50'
      case 'Executed': return 'text-gray-600 bg-gray-50'
      case 'No quorum': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="relative">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-semibold animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div>
      {!account ? (
        <div className="flex items-center justify-center min-h-screen">
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div>
          <div className="hidden md:block fixed top-4 right-4 space-y-3 max-w-sm z-40">
            {/* Wallet Info */}
            <div className="bg-white border border-gray-200 rounded shadow-lg p-4 space-y-3">
              <div>
                <div className="text-sm text-gray-600">Connected Account</div>
                <div className="font-mono text-sm">{account}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">ETH Balance</div>
                <div className="font-mono">{parseFloat(ethBalance).toFixed(4)} ETH</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Network</div>
                <div className={isSepoliaNetwork ? 'text-green-600' : 'text-orange-600'}>
                  {isSepoliaNetwork ? 'Sepolia ✓' : 'Not Sepolia'}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {!isSepoliaNetwork && (
                  <button
                    onClick={switchToSepolia}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Switch to Sepolia
                  </button>
                )}
                <button
                  onClick={disconnect}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Contract Info */}
            <div className="bg-white border border-gray-200 rounded shadow-lg p-4 space-y-3">
              <div className="text-sm font-semibold">Contracts</div>

              <div>
                <div className="text-sm text-gray-600">Token</div>
                <a
                  href={`https://sepolia.etherscan.io/address/0xeb797dcde8B9DD53c8bB7f0a0A026170fb8Edd7d`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  0xeb797dcde8B9DD53c8bB7f0a0A026170fb8Edd7d
                </a>
              </div>

              <div>
                <div className="text-sm text-gray-600">Governance</div>
                <a
                  href={`https://sepolia.etherscan.io/address/0xAcCC03e42867986D676FC3e7eF0D003F65ba2181`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  0xAcCC03e42867986D676FC3e7eF0D003F65ba2181
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md">
              {/* Tabs */}
              <div className="mb-4 bg-white rounded-xl shadow border border-gray-200 p-1 flex gap-1">
                <button
                  onClick={() => setActiveTab('exchange')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                    activeTab === 'exchange'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Exchange
                </button>
                <button
                  onClick={() => setActiveTab('vote')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                    activeTab === 'vote'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Vote
                </button>
              </div>

              {activeTab === 'exchange' ? (
                <>
                  {/* Points Info */}
                  <div className="mb-4 bg-white rounded-xl shadow p-4 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Points</div>
                        <div className="text-2xl font-bold">{points}</div>
                      </div>
                      <button
                        onClick={handleGetPoints}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        Earn Points
                      </button>
                    </div>
                  </div>

                  {/* Exchange Box */}
                  <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Exchange</h2>

                {/* From Section */}
                <div className="bg-gray-50 rounded-xl p-4 mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">From</span>
                    <span className="text-sm text-gray-600">Points: {points}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      max={points}
                      className="bg-transparent text-2xl font-semibold outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleMaxPoints}
                        className="px-2 py-1 bg-blue-100 text-blue-600 text-sm rounded hover:bg-blue-200"
                      >
                        MAX
                      </button>
                      <span className="font-semibold">Points</span>
                    </div>
                  </div>
                </div>

                {/* To Section */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">To</span>
                    <span className="text-sm text-gray-600">Balance: {tokenInfo?.balance || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-semibold">
                      {outputTokenAmount}
                    </div>
                    <span className="font-semibold">{tokenInfo?.symbol || 'TOKEN'}</span>
                  </div>
                </div>

                {/* Exchange Button */}
                <button
                  onClick={handleSwapToToken}
                  disabled={!isSepoliaNetwork || !swapAmount || parseInt(swapAmount) <= 0 || parseInt(swapAmount) > points || exchanging || loading}
                  className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {!isSepoliaNetwork ? 'Switch to Sepolia' : exchanging ? 'Exchanging...' : !swapAmount || parseInt(swapAmount) <= 0 ? 'Enter an amount' : parseInt(swapAmount) > points ? 'Insufficient balance' : 'Exchange'}
                </button>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Proposals</h2>
                    <button
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {showCreateForm ? 'Cancel' : 'Create Proposal'}
                    </button>
                  </div>

                  {/* Create Proposal Form */}
                  {showCreateForm && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Proposal Description
                        </label>
                        <textarea
                          value={proposalDescription}
                          onChange={(e) => setProposalDescription(e.target.value)}
                          placeholder="Enter proposal description..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={handleCreateProposal}
                        disabled={proposing || !proposalDescription.trim()}
                        className="w-full py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {proposing ? 'Creating...' : 'Create Proposal'}
                      </button>
                    </div>
                  )}

                  {!isSepoliaNetwork ? (
                    <div className="text-center py-8">
                      <p className="text-orange-600 mb-2">Please switch to Sepolia network</p>
                      <button
                        onClick={switchToSepolia}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Switch to Sepolia
                      </button>
                    </div>
                  ) : proposalsLoading ? (
                    <div className="text-center py-8 text-gray-600">Loading proposals...</div>
                  ) : proposals.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      <p>No proposals yet</p>
                      <p className="text-sm text-gray-500 mt-2">Check browser console for details</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <div key={proposal.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                          {/* Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">#{proposal.id}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStateColor(proposal.state)}`}>
                                {proposal.state}
                              </span>
                              {proposal.hasVoted && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                  ✓ Voted
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Ends: {new Date(proposal.endTime * 1000).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-gray-700 mb-4">{proposal.description}</p>

                          {/* Votes */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-xs text-gray-600 mb-1">For</div>
                              <div className="text-lg font-semibold text-green-700">
                                {parseFloat(proposal.forVotes).toFixed(0)}
                              </div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="text-xs text-gray-600 mb-1">Against</div>
                              <div className="text-lg font-semibold text-red-700">
                                {parseFloat(proposal.againstVotes).toFixed(0)}
                              </div>
                            </div>
                          </div>

                          {/* Execute Button - always visible */}
                          <button
                            onClick={() => handleExecute(proposal.id)}
                            disabled={proposal.state !== 'Succeeded' || voting || proposal.executed}
                            className="w-full py-3 mb-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                          >
                            {proposal.executed ? 'Already Executed' : proposal.state === 'Succeeded' ? 'Execute Proposal' : `Execute (${proposal.state})`}
                          </button>

                          {/* Vote Actions */}
                          {proposal.state === 'Active' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVote(proposal.id, true)}
                                disabled={voting || proposal.hasVoted}
                                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                              >
                                {proposal.hasVoted ? 'Already Voted' : 'Vote For'}
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, false)}
                                disabled={voting || proposal.hasVoted}
                                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                              >
                                {proposal.hasVoted ? 'Already Voted' : 'Vote Against'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
