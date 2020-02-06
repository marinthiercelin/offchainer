pragma solidity ^0.6.1;
import "./interfaces.sol";

contract __PROJECT_NAME__Requester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {}

    event Start(uint256 id);
    event End(uint256 id, uint256[] inputs, uint256 result);

    function start(uint256[] memory inputs) public returns (uint256){
        // ==== modify here ====
        require(inputs.length == 1, "Expects a single input");
        uint256[] memory f_inputs = inputs;
        // =====================
        // call for a computation of f(secret, f_input)
        uint256 id = secret_holder.requestComputation(f_inputs);
        emit Start(id);
    }

    function handleAnswer(uint256 id, uint256[] memory inputs, uint256 output) internal override {
        // receive the value f(secret, f_input)
        // ==== modify here ====

        uint256 result = output;

        // =====================
        emit End(id, inputs, result);
    }
}

interface VerifierContract{
    function verifyTx(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata inputs
    ) external returns (bool r);
}

contract __PROJECT_NAME__Holder is OffChainSecretHolder {

    uint256[2] public commitment;
    VerifierContract public verifier_contract;

    constructor(uint256[2] memory commitment_value, address verifier_contract_address) public{
        commitment = commitment_value;
        verifier_contract = VerifierContract(verifier_contract_address);
    }

    struct Proof{
        uint256[2] a;
        uint256[2][2] b;
        uint[2] c;
    }

    // We always return true, hence the computation is unverified
    function verifyProof(uint[] memory inputs, uint output, bytes memory proof) internal override returns (bool){
        Proof memory proof_struct = castProof(proof);
        uint len = inputs.length;
        uint256[] memory verifier_inputs = new uint256[](len+3);
        for(uint i = 0; i < len; i++){
            verifier_inputs[i] = inputs[i];
        }
        verifier_inputs[len] = commitment[0];
        verifier_inputs[len+1] = commitment[1];
        verifier_inputs[len+2] = output;
        bool check = verifier_contract.verifyTx(proof_struct.a, proof_struct.b, proof_struct.c, verifier_inputs);
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