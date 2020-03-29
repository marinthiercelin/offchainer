git submodule update --init --recursive;
cd dependencies/solidity &&
./scripts/install_deps.sh &&
mkdir build;
cd build &&
cmake .. && make;
cd ../.. &&
cd dependencies/libsnark &&
sudo apt install -y build-essential cmake git libgmp3-dev python-markdown libboost-all-dev libssl-dev &&
mkdir build && cd build && cmake .. && make;
cd ../.. &&
cd dependencies/Zokrates &&
git checkout develop  && git pull &&
cargo +nightly -Z package-features build --release --package zokrates_cli --features="libsnark";
cd ../.. &&
cd dependencies/zokrates_pycrypto &&
pip install -r requirements.txt;

