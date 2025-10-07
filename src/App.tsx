import { useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { useGovernanceToken } from './hooks/useGovernanceToken'

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
  const [points, setPoints] = useState(0)
  const [swapAmount, setSwapAmount] = useState('')

  const handleGetPoints = () => {
    setPoints(prev => prev + 10)
  }

  const handleSwapToToken = async () => {
    const amount = parseInt(swapAmount)

    if (!swapAmount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (amount > points) {
      alert('Insufficient points')
      return
    }

    try {
      await exchange(amount)
      setPoints(prev => prev - amount) // Deduct exchanged points
      setSwapAmount('') // Clear input
      await refreshBalance() // Refresh ETH balance after transaction
      alert('Successfully exchanged ' + amount + ' points to tokens!')
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

      alert(errorMessage)
    }
  }

  const handleMaxPoints = () => {
    setSwapAmount(points.toString())
  }

  const outputTokenAmount = swapAmount ? parseInt(swapAmount) : 0

  return (
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
          <div className="fixed top-4 right-4 space-y-3">
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

            {/* Token Info */}
            {tokenInfo && (
              <div className="bg-white border border-gray-200 rounded shadow-lg p-4 space-y-3">
                <div className="text-sm font-semibold">Token Contract</div>

                <div>
                  <div className="text-sm text-gray-600">Contract Address</div>
                  <a
                    href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS || '0xeb797dcde8B9DD53c8bB7f0a0A026170fb8Edd7d'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {import.meta.env.VITE_CONTRACT_ADDRESS || '0xeb797dcde8B9DD53c8bB7f0a0A026170fb8Edd7d'}
                  </a>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Total Supply</div>
                  <div className="text-sm">{parseFloat(tokenInfo.totalSupply).toLocaleString()} {tokenInfo.symbol}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">My Balance</div>
                  <div className="text-sm">{parseFloat(tokenInfo.balance).toLocaleString()} {tokenInfo.symbol}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md">
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
                  disabled={!swapAmount || parseInt(swapAmount) <= 0 || parseInt(swapAmount) > points || exchanging || loading}
                  className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {exchanging ? 'Exchanging...' : !swapAmount || parseInt(swapAmount) <= 0 ? 'Enter an amount' : parseInt(swapAmount) > points ? 'Insufficient balance' : 'Exchange'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
