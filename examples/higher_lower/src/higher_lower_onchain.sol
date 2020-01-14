pragma solidity ^0.6.1;
import "./interfaces.sol";

contract higher_lowerRequester is SecretRequester {

    // Enumerate the possible answers
    enum Answer {Higher, Lower, Correct}

    // Sets the range
    uint256 constant max_value=10;
    string constant range_message = "Must be a value from 0 to 10";

    // Keep the adress of the involved parties
    address payable public owner;
    address payable public player;

    // Ether given by the owner as a prize to the winner;
    uint public prize;

    // The player has only a certain amount of tries to win;
    uint public max_tries;
    uint public nb_tries;

    // Keep the last guess while waiting for the answer;
    uint256 request_id;

    // Keep the state of the game
    enum Status {WaitingForPlayer, WaitingGuess, WaitingAnswer, PlayerWon, PlayerLost}
    Status public status;

    // Stores the commitment to the secret_value
    uint[2] public commitment;

    /// Access control
    modifier onlyOwner(){
        require(msg.sender==owner, "Only the owner of the contract can call that");
        _;
    }

    /// Access control
    modifier onlyPlayer(){
        require(msg.sender==player, "Only the player can call that");
        _;
    }

    ///Check that we are in the appropriate state
    modifier hasStatus(Status required_status){
        require(status == required_status, "Wrong state");
        _;
    }
    constructor(SecretHolder secret_holder, uint256 max_tries_val)
        SecretRequester(secret_holder)
        public
        payable
    {
        owner = msg.sender;
        prize = msg.value;
        status = Status.WaitingForPlayer;
        max_tries = max_tries_val;
        nb_tries = 0;
    }

    event Start(uint256 id);
    event End(uint256 id, uint256 input, Answer result);

    function makeGuess(uint256 guess) public returns (uint256){
        // ==== modify here ====
        require(guess >= 0, range_message);
        require(guess <= max_value, range_message);
        if(status == Status.WaitingForPlayer){
            player = msg.sender;
            status = Status.WaitingGuess;
        }
        require(msg.sender==player, "Only the player can call that");
        require(status == Status.WaitingGuess, "Wrong state");
        nb_tries++;
        status = Status.WaitingAnswer;
        // =====================
        // call for a computation of f(secret, f_input)
        request_id = secret_holder.requestComputation(guess);
        emit Start(request_id);
    }

    function handleAnswer(uint256 id, uint256 input, uint256 output) override internal {
        // receive the value f(secret, f_input)
        // ==== modify here ====
        require(id==request_id, "Answers to the wrong guess");
        require(status == Status.WaitingAnswer, "Wrong state");
        Answer answer = Answer(output);
        // =====================
        emit End(id, input, answer);
        endRound(answer);
    }

    /// Check what to do at the end of the round
    function endRound(Answer answer) private hasStatus(Status.WaitingAnswer){
        if(answer==Answer.Correct){
            endGame(true);
        }else if (max_tries > 0 && nb_tries >= max_tries){
            endGame(false);
        }else{
            status = Status.WaitingGuess;
        }
    }

    /// Deals with what happened at the end of the game
    function endGame(bool player_won) private hasStatus(Status.WaitingAnswer) {
        if(player_won){
            status = Status.PlayerWon;
            player.transfer(prize);
        }else{
            status = Status.PlayerLost;
            owner.transfer(prize);
        }
    }
}

interface VerifierContract{
    function verifyTx(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[4] calldata input
    ) external returns (bool r);
}

contract higher_lowerHolder is OffChainSecretHolder {

    uint256[2] public commitment;
    address public verifier_contract;
    string private verifyTxSignature = "verifyTx(uint256[2],uint256[2][2],uint256[2],uint256[4])";

    constructor(uint256[2] memory commitment_value, address verifier_contract_address) public{
        commitment = commitment_value;
        verifier_contract = verifier_contract_address;
    }

    struct Proof{
        uint256[2] a;
        uint256[2][2] b;
        uint[2] c;
    }

    

    // We always return true, hence the computation is unverified
    function verifyProof(uint input, uint output, bytes memory proof) internal override returns (bool){
        Proof memory proof_struct = castProof(proof);
        uint256[4] memory verifier_inputs;
        verifier_inputs[0] = input;
        verifier_inputs[1] = commitment[0];
        verifier_inputs[2] = commitment[1];
        verifier_inputs[3] = output;
        bool check = VerifierContract(verifier_contract).verifyTx(proof_struct.a, proof_struct.b, proof_struct.c, verifier_inputs);
        return check;
    }


    function castProof(bytes memory proof_bytes) internal pure returns (Proof memory){
        require(proof_bytes.length==256, "the proof should be 256 bytes long");
        uint256[2] memory a;
        a[0] = bytesToInt(proof_bytes, 0);
        a[1] = bytesToInt(proof_bytes, 32);
        uint256[2][2] memory b;
        b[0][0] = bytesToInt(proof_bytes, 64);
        b[0][1] = bytesToInt(proof_bytes, 96);
        b[1][0] = bytesToInt(proof_bytes, 128);
        b[1][1] = bytesToInt(proof_bytes, 160);
        uint256[2] memory c;
        c[0] = bytesToInt(proof_bytes, 192);
        c[1] = bytesToInt(proof_bytes, 224);
        return Proof(a,b,c);
    }

    function bytesToInt(bytes memory b, uint256 offset) private pure returns (uint256) {
        bytes32 out;
        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return uint256(out);
    }
}