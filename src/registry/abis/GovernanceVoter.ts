export const governanceVoterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "p",
        type: "tuple",
        internalType: "struct GovernanceVoter.DeployParams",
        components: [
          {
            name: "sbfBmx",
            type: "address",
            internalType: "address",
          },
          {
            name: "stakedBmxTracker",
            type: "address",
            internalType: "address",
          },
          {
            name: "bnBmx",
            type: "address",
            internalType: "address",
          },
          {
            name: "bmx",
            type: "address",
            internalType: "address",
          },
          {
            name: "weth",
            type: "address",
            internalType: "address",
          },
          {
            name: "universalRouter",
            type: "address",
            internalType: "address",
          },
          {
            name: "v4PositionManager",
            type: "address",
            internalType: "address",
          },
          {
            name: "treasury",
            type: "address",
            internalType: "address",
          },
          {
            name: "fallbackTreasury",
            type: "address",
            internalType: "address",
          },
          {
            name: "epochZero",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "epochDuration",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "poolFee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "poolTickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "poolHooks",
            type: "address",
            internalType: "address",
          },
          {
            name: "keeper",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "ACTION_SET_FALLBACK_TREASURY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ACTION_SET_GOVERNANCE_BURN",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ACTION_SET_KEEPER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ACTION_SET_TREASURY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "BMX",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "BN_BMX",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DEAD_ADDRESS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "EPOCH_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "EPOCH_ZERO",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FORCE_EXECUTE_DELAY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OPTION_BUY_BURN_BMX",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OPTION_BUY_BURN_LP",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OPTION_PARTICIPATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OPTION_TREASURY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "POOL_FEE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint24",
        internalType: "uint24",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "POOL_HOOKS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "POOL_TICK_SPACING",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "int24",
        internalType: "int24",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "SBF_BMX",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IRewardTracker",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "STAKED_BMX_TRACKER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IRewardTracker",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIMELOCK_DELAY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIMELOCK_EXPIRY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "UNIVERSAL_ROUTER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "V4_POSITION_MANAGER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "WETH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "accountedBudget",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "burnedActions",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelAction",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelBurnAction",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "consecutiveWinCount",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentEpoch",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "epochInfoStorage",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "snapshotTotalWeight",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "budget",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalVoteWeight",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "voterCount",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "winningOption",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "snapshotSet",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "finalized",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "executed",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amountOutMin",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "liquidity",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeBurnAction",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetFallbackTreasury",
    inputs: [
      {
        name: "_fallbackTreasury",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetGovernanceBurn",
    inputs: [
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetKeeper",
    inputs: [
      {
        name: "_keeper",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetTreasury",
    inputs: [
      {
        name: "_treasury",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fallbackTreasury",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "finalizationInProgress",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "finalize",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxBatch",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "forceMarkExecuted",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getEpochInfo",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct GovernanceVoter.EpochInfo",
        components: [
          {
            name: "snapshotTotalWeight",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "budget",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "totalVoteWeight",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "optionWeights",
            type: "uint256[4]",
            internalType: "uint256[4]",
          },
          {
            name: "voterCount",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "winningOption",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "snapshotSet",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "finalized",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "executed",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEpochVoters",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPendingBurn",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "isPending",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "executeTime",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "expiresAt",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPendingChange",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "isPending",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "executeTime",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "expiresAt",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserVote",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct GovernanceVoter.UserVote",
        components: [
          {
            name: "weight",
            type: "uint248",
            internalType: "uint248",
          },
          {
            name: "option",
            type: "uint8",
            internalType: "uint8",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "governanceBurnAmount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initializePeers",
    inputs: [
      {
        name: "_lpLocker",
        type: "address",
        internalType: "address",
      },
      {
        name: "_participationDistributor",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isActionBurned",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isOptionEligible",
    inputs: [
      {
        name: "option",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "keeper",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastFinalizedEpoch",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastIneligibleEpoch",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lpLocker",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "participationDistributor",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "peersInitialized",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingBurns",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "dataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "signalTime",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "delay",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingChanges",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "dataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "signalTime",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "delay",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signalAction",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "dataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signalBurnAction",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userVotes",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "weight",
        type: "uint248",
        internalType: "uint248",
      },
      {
        name: "option",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      {
        name: "option",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ActionBurnCanceled",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ActionBurnExecuted",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ActionBurnSignaled",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "executeTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "expiresAt",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChangeCanceled",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChangeExecuted",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChangeSignaled",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "dataHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "executeTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "expiresAt",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EpochExecuted",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "option",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "raiseTokenAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "forced",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "destination",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EpochFinalized",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "winningOption",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "quorumMet",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "budget",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FallbackTreasuryChanged",
    inputs: [
      {
        name: "oldAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "newAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GovernanceBurnChanged",
    inputs: [
      {
        name: "oldAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "KeeperChanged",
    inputs: [
      {
        name: "oldKeeper",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "newKeeper",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PeersInitialized",
    inputs: [
      {
        name: "lpLocker",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "participationDistributor",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TreasuryChanged",
    inputs: [
      {
        name: "oldAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "newAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Voted",
    inputs: [
      {
        name: "epoch",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "voter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "option",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "weight",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "ActionAlreadyBurned",
    inputs: [],
  },
  {
    type: "error",
    name: "ActionIsBurned",
    inputs: [
      {
        name: "action",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "AlreadyVoted",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochAlreadyExecuted",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochAlreadyFinalized",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochNotActive",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochNotExecutable",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochNotFinalized",
    inputs: [],
  },
  {
    type: "error",
    name: "EpochNotOverdue",
    inputs: [],
  },
  {
    type: "error",
    name: "FinalizationInProgress",
    inputs: [],
  },
  {
    type: "error",
    name: "GovernanceBurnOutOfRange",
    inputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientParticipationPoints",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientVotingWeight",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidOption",
    inputs: [],
  },
  {
    type: "error",
    name: "NotKeeper",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyWETH",
    inputs: [],
  },
  {
    type: "error",
    name: "OptionIneligible",
    inputs: [
      {
        name: "option",
        type: "uint8",
        internalType: "uint8",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "PeerWiringMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "PeersAlreadyInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "PeersNotInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "PreviousEpochNotExecuted",
    inputs: [],
  },
  {
    type: "error",
    name: "SafeCastOverflowedUintDowncast",
    inputs: [
      {
        name: "bits",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "TimelockDataMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "TimelockExpired",
    inputs: [
      {
        name: "expiredAt",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "TimelockNotSignaled",
    inputs: [],
  },
  {
    type: "error",
    name: "TimelockTooEarly",
    inputs: [
      {
        name: "executeTime",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "WrongFinalizeEpoch",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroBatch",
    inputs: [],
  },
] as const;
