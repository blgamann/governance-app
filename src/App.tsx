import { useWallet } from './hooks/useWallet'

function App() {
  const {
    account,
    isConnecting,
    isSepoliaNetwork,
    connectWallet,
    switchToSepolia,
    disconnect,
  } = useWallet()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Ethereum Wallet Connection</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Connected Account</div>
            <div className="font-mono">{account}</div>
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
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Switch to Sepolia
              </button>
            )}
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
