import { NearBindgen, near, call, NearPromise, initialize } from "near-sdk-js";
import { AccountId } from "near-sdk-js/lib/types";
import { deserialize, serialize } from "near-sdk-js/lib/utils";

const XCC_GAS = 10n ** 13n; // 10e13yⓃ
const NO_DEPOSIT = 0n; // 0yⓃ
const NO_ARGS = "";
const HELLO_CONTRACT = "hello.near-examples.testnet";
const COUNTER_CONTRACT = "counter.near-examples.testnet";
const GUESTBOOK_CONTRACT = "guestbook.near-examples.testnet";

interface HelloArguments {
  greeting: string;
}

interface PostedMessage {
  premium: boolean;
  sender: AccountId;
  text: string;
}

interface GuestbookArguments {
  from_index: string;
  limit: number;
}

@NearBindgen({ requireInit: true })
export class HelloNear {
  helloAccount: AccountId = HELLO_CONTRACT;
  counterAccount: AccountId = COUNTER_CONTRACT;
  guestbookAccount: AccountId = GUESTBOOK_CONTRACT;

  @initialize({})
  init({
    hello_account,
    counter_account,
    guestbook_account,
  }: {
    hello_account: AccountId;
    counter_account: AccountId;
    guestbook_account: AccountId;
  }): void {
    this.helloAccount = hello_account;
    this.counterAccount = counter_account;
    this.guestbookAccount = guestbook_account;
  }

  @call({})
  batch_actions(): NearPromise {
    const hi: HelloArguments = { greeting: "hi" };
    const bye: HelloArguments = { greeting: "bye" };

    // You can create one transaction calling multiple methods
    // on a same contract
    return NearPromise.new(this.helloAccount)
      .functionCall("set_greeting", serialize(hi), NO_DEPOSIT, XCC_GAS)
      .functionCall("get_greeting", NO_ARGS, NO_DEPOSIT, XCC_GAS)
      .functionCall("set_greeting", serialize(bye), NO_DEPOSIT, XCC_GAS)
      .functionCall("get_greeting", NO_ARGS, NO_DEPOSIT, XCC_GAS)
      .then(
        NearPromise.new(near.currentAccountId()).functionCall(
          "batch_actions_callback",
          NO_ARGS,
          NO_DEPOSIT,
          XCC_GAS
        )
      );
  }

  @call({ privateFunction: true })
  batch_actions_callback(): string {
    // The callback only has access to the last action's result
    try {
      const result = near.promiseResult(0);
      const message = deserialize(result) as string;

      near.log(`The last result is ${message}`);

      return message;
    } catch {
      near.log("The batch call failed and all calls got reverted");

      return "";
    }
  }

  @call({})
  /**
   * A method which calls different contracts via cross contract function calls.
   */
  multiple_contracts(): NearPromise {
    // We create a promise that calls the `get_greeting` function on the HELLO_CONTRACT
    const helloPromise = NearPromise.new(this.helloAccount).functionCall(
      "get_greeting",
      NO_ARGS,
      NO_DEPOSIT,
      XCC_GAS
    );

    // We create a promise that calls the `get_num` function on the COUNTER_CONTRACT
    const counterPromise = NearPromise.new(this.counterAccount).functionCall(
      "get_num",
      NO_ARGS,
      NO_DEPOSIT,
      XCC_GAS
    );

    // We create a promise that calls the `get_messages` function on the GUESTBOOK_CONTRACT
    const args: GuestbookArguments = { from_index: "0", limit: 2 };

    const guestbookPromise = NearPromise.new(
      this.guestbookAccount
    ).functionCall("get_messages", serialize(args), NO_DEPOSIT, XCC_GAS);

    // We join all promises and chain a callback to collect their results.
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
  }

  @call({ privateFunction: true })
  multiple_contracts_callback(): [string, number, Array<PostedMessage>] {
    // The callback has access to the result of the 3 calls
    let greeting = "";

    try {
      const result = near.promiseResult(0);

      greeting = deserialize(result) as string;
      near.log(`HelloNear says ${result}`);
    } catch {
      near.log("The call to HelloNear failed");
    }

    let counter = 0;

    try {
      const result = near.promiseResult(1);

      counter = deserialize(result) as number;
      near.log(`Counter is ${counter}`);
    } catch {
      near.log("The call to Counter failed");
    }

    let messages: Array<PostedMessage> = [];

    try {
      const result = near.promiseResult(2);

      messages = deserialize(result) as Array<PostedMessage>;
      near.log(`The messages are ${JSON.stringify(messages)}`);
    } catch {
      near.log("The call to GuestBook failed");
    }

    return [greeting, counter, messages];
  }

  private promiseSetGet(greeting: string): NearPromise {
    // Aux method to create a batch transaction calling
    // set_message and get_message in the HELLO CONTRACT
    const helloArgs: HelloArguments = { greeting };

    return NearPromise.new(this.helloAccount)
      .functionCall("set_greeting", serialize(helloArgs), NO_DEPOSIT, XCC_GAS)
      .functionCall("get_greeting", NO_ARGS, NO_DEPOSIT, XCC_GAS);
  }

  @call({})
  similar_contracts(): NearPromise {
    // Create promises to call 3 contracts that return the same type
    // For simplicity here we call the same contract
    const helloOne = this.promiseSetGet("hi");
    const helloTwo = this.promiseSetGet("howdy");
    const helloThree = this.promiseSetGet("bye");

    // Join all promises and chain a callback to collect their results.
    return helloOne
      .and(helloTwo)
      .and(helloThree)
      .then(
        NearPromise.new(near.currentAccountId()).functionCall(
          "similar_contracts_callback",
          NO_ARGS,
          NO_DEPOSIT,
          XCC_GAS
        )
      );
  }

  @call({ privateFunction: true })
  similar_contracts_callback(): Array<string> {
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
  }
}
