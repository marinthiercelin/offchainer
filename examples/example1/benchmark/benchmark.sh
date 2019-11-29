nb_points=0; 
data_dir='data';
example_dir='..';
example='example1.js'
data_file='measures.csv'
#modes=("onchain" "unverified" "zokrates");
modes=("zokrates");
for mode in "${modes[@]}"; do
    nodejs $example_dir/$example --mode $mode --measure -o $data_dir/$data_file --repeat $nb_points -p;
done

db_name='measures.db';
rm $data_dir/$db_name; 
cat load_data.sql | \
    sed -e "s/__DATA_DIR__/$data_dir/g" | \
    sed -e "s/__DATA_FILE__/$data_file/g" | \
    sqlite3 $data_dir/$db_name; 

plot_dir='plots'
python3 make_plots.py $data_dir/$db_name $plot_dir