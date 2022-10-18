# Complex Cross-Contract Calls Examples

This contract presents 3 examples on how to do complex cross-contract calls. Particularly, it shows:

1. How to batch method calls to a same contract.
2. How to call multiple contracts in parallel, each returning a different type.
3. Different ways of handling the responses in the callback.

<br />

## 1. Batch Actions

You can aggregate multiple actions directed towards one same contract into a batched transaction.
Methods called this way are executed sequentially, with the added benefit that, if one fails then
they **all get reverted**.

```typescript
// Promise with batch actions
NearPromise.new(this.helloAccount)
  .functionCall( ... )
  .functionCall( ... )
  .functionCall( ... )
  .functionCall( ... )
  .then(
    NearPromise.new(near.currentAccountId()).functionCall(
      "batch_actions_callback",
      NO_ARGS,
      NO_DEPOSIT,
      XCC_GAS
    )
  );
```

In this case, the callback has access to the value returned by the **last
action** from the chain.

<br />

## 2. Calling Multiple Contracts

A contract can call multiple other contracts. This creates multiple transactions that execute
all in parallel. If one of them fails the rest **ARE NOT REVERTED**.

```typescript
const helloPromise = NearPromise.new(this.helloAccount).functionCall( ... );
const counterPromise = NearPromise.new(this.counterAccount).functionCall( ... );
const guestbookPromise = NearPromise.new(this.guestbookAccount).functionCall( ... );

// Calling multiple contracts in parallel
return helloPromise
  .and(counterPromise)
  .and(guestbookPromise)
  .then(
    NearPromise.new(near.currentAccountId()).functionCall(
      "multiple_contracts_callback",
      NO_ARGS,
      NO_DEPOSIT,
      XCC_GAS
    )
  );
```

In this case, the callback has access to an **array of responses**, which have either the
value returned by each call, or an error message.

<br />

## 3. Calling Contracts With the Same Return Type

This example is a particular case of the previous one ([2. Calling Multiple Contracts](#2-calling-multiple-contracts)).
It simply showcases a different way to check the results by directly accessing the `promise_result` array.

```typescript
return [0, 1, 2]
  .map((index) => {
    try {
      // near.promiseResult(i) has the result of the i-th call
      const result = near.promiseResult(index);

      let message: string;

      try {
        message = deserialize(result) as string;
      } catch {
        near.log(`Error deserializing call ${index} result.`);

        return "";
      }

      near.log(`Call ${index} returned: ${message}`);

      return message;
    } catch {
      near.log(`Promise number ${index} failed.`);

      return "";
    }
  })
  .filter((message) => message.length > 0);
```
