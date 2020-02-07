pragma solidity ^0.6.1;
import "./interfaces.sol";

contract black_listRequester is SecretRequester {

    bytes32 public nounce;

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {
       nounce = this.getLastBlockHash();
    }
    
    function getLastBlockHash() internal pure returns (bytes32){
        return block.blockhash(block.number - 1);
    }

    event Start(uint256 id);
    event End(uint256 id, uint256[] input, bool authorized);

    function verify(uint256 hidden_user_id, bytes32 nounce_used) public returns (uint256){
        // ==== modify here ====
        require(nounce_used==this.nounce, "You used the wrong nonce");
        uint256[2] memory f_input = [hidden_user_id, this.nounce];
        // =====================
        // call for a computation of f(secret, f_input)
        uint256 id = secret_holder.requestComputation(f_input);
        emit Start(id);
    }

    function handleAnswer(uint256 id, uint256[] input, uint256 output) internal override {
        // receive the value f(secret, f_input)
        // ==== modify here ====

        bool result = output == 1;
        // =====================
        emit End(id, input, result);
    }
}

interface VerifierContract{
    function verifyTx(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[5] calldata input
    ) external returns (bool r);
}

contract black_listHolder is OffChainSecretHolder {

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
    function verifyProof(uint[2] input, uint output, bytes memory proof) internal override returns (bool){
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