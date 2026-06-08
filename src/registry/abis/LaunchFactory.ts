export const launchFactoryAbi = [
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
        internalType: "struct LaunchFactory.DeployParams",
        components: [
          {
            name: "tokenImpl",
            type: "address",
            internalType: "address",
          },
          {
            name: "feeDistributorImpl",
            type: "address",
            internalType: "address",
          },
          {
            name: "presaleImpl",
            type: "address",
            internalType: "address",
          },
          {
            name: "vestingImpl",
            type: "address",
            internalType: "address",
          },
          {
            name: "lpStakingImpl",
            type: "address",
            internalType: "address",
          },
          {
            name: "bmx",
            type: "address",
            internalType: "address",
          },
          {
            name: "raiseToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "boardwalkRouter",
            type: "address",
            internalType: "address",
          },
          {
            name: "boardwalkDexFactory",
            type: "address",
            internalType: "address",
          },
          {
            name: "boardwalkLpManager",
            type: "address",
            internalType: "address",
          },
          {
            name: "boardwalkFeeCollector",
            type: "address",
            internalType: "address",
          },
          {
            name: "bmxBurnAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "graduationExpress",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "graduationAdvanced",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "expressDuration",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "advancedDuration",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "feeBps",
            type: "tuple",
            internalType: "struct LaunchFactory.FeeBpsDefaults",
            components: [
              {
                name: "issuer",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "boardwalk",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "incentive",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "referrer",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "integrator",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "total",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ACTION_SET_ADVANCED_DURATION",
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
    name: "ACTION_SET_BMX_BURN",
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
    name: "ACTION_SET_EXPRESS_DURATION",
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
    name: "ACTION_SET_FEE_COLLECTOR",
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
    name: "ACTION_SET_FEE_DEFAULTS",
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
    name: "ACTION_SET_GRADUATION_ADVANCED",
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
    name: "ACTION_SET_GRADUATION_EXPRESS",
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
    name: "ACTION_SET_INTEGRATOR",
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
    name: "ACTION_SET_PRESALE_RANGE",
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
    name: "BOARDWALK_DEX_FACTORY",
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
    name: "BOARDWALK_LP_MANAGER",
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
    name: "BOARDWALK_ROUTER",
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
    name: "FEE_DISTRIBUTOR_IMPL",
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
    name: "LP_STAKING_IMPL",
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
    name: "PRESALE_IMPL",
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
    name: "RAISE_TOKEN",
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
    name: "TOKEN_IMPL",
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
    name: "VESTING_IMPL",
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
    name: "advancedDuration",
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
    name: "allLaunches",
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
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bmxBurnAmount",
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
    name: "memberLaunchDiscountBps",
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
    name: "nftCollection",
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
    name: "boardwalkFeeCollector",
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
    name: "createLaunch",
    inputs: [
      {
        name: "config",
        type: "tuple",
        internalType: "struct LaunchFactory.LaunchConfig",
        components: [
          {
            name: "name",
            type: "string",
            internalType: "string",
          },
          {
            name: "ticker",
            type: "string",
            internalType: "string",
          },
          {
            name: "category",
            type: "string",
            internalType: "string",
          },
          {
            name: "description",
            type: "string",
            internalType: "string",
          },
          {
            name: "path",
            type: "uint8",
            internalType: "enum LaunchFactory.LaunchPath",
          },
          {
            name: "presalePercent",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "vestingRecipients",
            type: "address[]",
            internalType: "address[]",
          },
          {
            name: "vestingPercents",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "vestingLabels",
            type: "string[]",
            internalType: "string[]",
          },
          {
            name: "referrer",
            type: "address",
            internalType: "address",
          },
          {
            name: "issuerFeeRecipients",
            type: "address[]",
            internalType: "address[]",
          },
          {
            name: "issuerFeeSplits",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "issuerFeeLabels",
            type: "string[]",
            internalType: "string[]",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "tokenAddr",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "currentFeeBps",
    inputs: [],
    outputs: [
      {
        name: "issuer",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "boardwalk",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "incentive",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "referrer",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "integratorBps",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "total",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
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
    name: "executeSetAdvancedDuration",
    inputs: [
      {
        name: "_duration",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetBmxBurn",
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
    name: "executeSetExpressDuration",
    inputs: [
      {
        name: "_duration",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetFeeCollector",
    inputs: [
      {
        name: "_collector",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetFeeDefaults",
    inputs: [
      {
        name: "_feeBps",
        type: "tuple",
        internalType: "struct LaunchFactory.FeeBpsDefaults",
        components: [
          {
            name: "issuer",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "boardwalk",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "incentive",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "referrer",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integrator",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "total",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetGraduationAdvanced",
    inputs: [
      {
        name: "_threshold",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetGraduationExpress",
    inputs: [
      {
        name: "_threshold",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetIntegrator",
    inputs: [
      {
        name: "_integrator",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSetPresaleRange",
    inputs: [
      {
        name: "_min",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_max",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "expressDuration",
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
    name: "graduationAdvanced",
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
    name: "graduationExpress",
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
    name: "integrator",
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
    name: "isLaunchToken",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
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
    name: "launchCount",
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
    name: "launches",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "feeDistributor",
        type: "address",
        internalType: "address",
      },
      {
        name: "presaleManager",
        type: "address",
        internalType: "address",
      },
      {
        name: "vestingStream",
        type: "address",
        internalType: "address",
      },
      {
        name: "lpStaking",
        type: "address",
        internalType: "address",
      },
      {
        name: "issuer",
        type: "address",
        internalType: "address",
      },
      {
        name: "path",
        type: "uint8",
        internalType: "enum LaunchFactory.LaunchPath",
      },
      {
        name: "createdAt",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxPresalePercent",
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
    name: "minPresalePercent",
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
    name: "BmxBurnAmountChanged",
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
    name: "FeeCollectorChanged",
    inputs: [
      {
        name: "oldCollector",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "newCollector",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeDefaultsChanged",
    inputs: [
      {
        name: "issuer",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "boardwalk",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "incentive",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "referrer",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "integrator",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GraduationThresholdChanged",
    inputs: [
      {
        name: "path",
        type: "uint8",
        indexed: false,
        internalType: "enum LaunchFactory.LaunchPath",
      },
      {
        name: "oldThreshold",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newThreshold",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "IntegratorChanged",
    inputs: [
      {
        name: "oldIntegrator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "newIntegrator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "LaunchCreated",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "issuer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "ticker",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "category",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "path",
        type: "uint8",
        indexed: false,
        internalType: "enum LaunchFactory.LaunchPath",
      },
      {
        name: "issuerFeeLabels",
        type: "string[]",
        indexed: false,
        internalType: "string[]",
      },
      {
        name: "vestingLabels",
        type: "string[]",
        indexed: false,
        internalType: "string[]",
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
    name: "PresaleDurationChanged",
    inputs: [
      {
        name: "path",
        type: "uint8",
        indexed: false,
        internalType: "enum LaunchFactory.LaunchPath",
      },
      {
        name: "oldDuration",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newDuration",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PresaleRangeChanged",
    inputs: [
      {
        name: "oldMin",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "oldMax",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMin",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMax",
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
    name: "ArrayLengthMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "BmxBurnOutOfRange",
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
    name: "ExpressRequiresOneFeeRecipient",
    inputs: [],
  },
  {
    type: "error",
    name: "FailedDeployment",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      {
        name: "balance",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "needed",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "IntegratorMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "IntegratorNotAllowedWithReferrer",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidDuration",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidFeeDefaults",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidPresalePercent",
    inputs: [
      {
        name: "percent",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidPresaleRange",
    inputs: [
      {
        name: "min",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "max",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidSplitsSum",
    inputs: [],
  },
  {
    type: "error",
    name: "IssuerVestingRecipientsRequired",
    inputs: [],
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
    name: "PresalePercentNotDivisibleBy5",
    inputs: [],
  },
  {
    type: "error",
    name: "ReferrerNotAllowedOnExpressPath",
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
    name: "TooManyRecipients",
    inputs: [
      {
        name: "count",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "VestingNotAllowedOnExpressPath",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroGraduation",
    inputs: [],
  },
] as const;
