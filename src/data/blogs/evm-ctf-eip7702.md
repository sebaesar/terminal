---
title: "ETH CTF"
date: "2024-09-11"
description: "How I solved a CTF by turning an EOA into a temporary smart contract using EIP-7702"
slug: evm-ctf-eip7702
tags: ["Ethereum", "Smart Contracts", "Security"]
authors: ["milad"]
---

## The Challenge

This week, I got my hands on a fascinating puzzle. At first glance, it seemed simple:

> Deploy a contract to Sepolia and make its `flag()` function return my wallet address.

But as I dug deeper, I realized this wasn't your typical smart contract challenge. It would push me to combine my bytecode analysis skills with one of Ethereum's newest features - something I had been eager to try out in a real-world scenario.

## The Challenge Walkthrough

### Step 1: Understanding Deployment vs Runtime Bytecode

The challenge started with a blob of deployment bytecode. After deploying it to Sepolia, I decompiled the deployment stub which revealed:

```solidity
function __function_selector__() public payable {
    require(msg.value == 0);
    return RUNTIME_BYTECODE;
}
```

This confirmed it was just a wrapper that returns the runtime bytecode to be installed on-chain.

### Step 2: Decompiling the Runtime Bytecode

Using decompilation tools, I discovered two key functions in the runtime bytecode:

```solidity
function flag() public view returns (address) {
    return _flag;
}

function fallback() external payable {
    // forward call with selector 0xe8c21a3
    (bool ok, bytes memory data) = msg.sender.call(abi.encodeWithSelector(0xe8c21a3));
    require(ok, "Call failed");
    require(abi.decode(data, (bool)), "Wrong answer");

    _flag = msg.sender;
}
```

The logic was elegantly simple:

- flag() just returns \_flag.
- \_flag is only updated if the fallback() succeeds.
- The fallback() does a msg.sender.call(...) expecting a truthy return.

### Step 3: The Key Insight

Upon closer inspection, I noticed something interesting: the contract doesn't call itself back. Instead, it calls `msg.sender` with a fixed selector `0xe8c21a3`. This led to two important observations:

- If `msg.sender` is an EOA (Externally Owned Account) → No code exists, so the call fails
- If `msg.sender` is a contract with a fallback → It can handle the selector and return true

This meant the contract required its caller to be a contract that could respond appropriately to this challenge.

### Step 4: The EOA Challenge

Here's where it got interesting: the challenge specifically required my EOA address to be stored in `_flag`.

Historically, this would have been impossible since EOAs cannot contain code. However, [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) introduced a game-changing capability: EOAs can now temporarily deploy code to themselves through signed transactions.

This was the trick:

- Turn the EOA into a contract with a permissive fallback() that returns true.
- Trigger the original contract’s fallback().
- \_flag = msg.sender → my EOA.

### Putting It All Together

After understanding the challenge's mechanics, I knew I'd need my full toolkit for this one. First stop: [Dedaub](https://app.dedaub.com/decompile?network=ethereum) for bytecode analysis. I've always loved how it peels back the layers of compiled contracts, and this time it didn't disappoint.

With the bytecode decompiled, I set up my development environment. Foundry has been my go-to for contract deployment lately, but I had a feeling I'd need more than just that. The tricky part was going to be that EOA transaction - this is where ethers.js came into play.

Here's what my solution looked like:

```javascript
const auth = ether_signer.authorizeSync({
  address: IMPLEMENTATION_CONTRACT_ADDRESS,
  chainId: CHAIN_ID,
  nonce: nonce,
});
```

I'll admit, crafting that payload took some trial and error. EIP-7702 is cutting-edge stuff, and there aren't many examples out there yet. But that's what made it exciting - I was pushing the boundaries of what's possible with EOAs.

To make sure everything worked:

```bash
# The moment of truth
cast call $CONTRACT_ADDRESS "flag()(address)"
```

When I saw my address pop up, I couldn't help but smile. It worked perfectly - I had turned my regular wallet into a smart contract just long enough to pass the challenge.

## Lessons Learned

- Decompilation first: understanding runtime vs deployment bytecode is critical.
- Contracts can ask EOAs to act like contracts; with EIP-7702, this is possible.
- Tooling gap: Foundry wasn’t enough; raw transaction signing in ethers.js was needed.

This was a neat mix of bytecode archaeology and bleeding-edge Ethereum features.

## Looking Back

This challenge reminded me why I love working with Ethereum. It's not just about writing smart contracts - it's about understanding the entire stack, from raw bytecode to the latest protocol features. I got to use everything in my toolbox: bytecode analysis, contract development, and some creative problem-solving with EIP-7702.

What really made this interesting was how it pushed me to think differently about EOAs and smart contracts. We often treat them as completely separate things, but with new features like EIP-7702, the lines are starting to blur in fascinating ways.

Most importantly, it showed me that staying curious about new protocol features pays off. EIP-7702 had caught my eye when it was first proposed, and being able to use it in a practical scenario was incredibly satisfying.

I'm looking forward to my next challenge - there's always something new to learn in this space!
