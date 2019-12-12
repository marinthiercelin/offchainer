import sqlite3
import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator
import math

def make_cost_by_actor_plots (conn, modes, output_dir):
    actors = get_value_set(conn, 'actor')
    cost_types = get_value_set(conn, 'type')
    for actor in actors:
        for cost_type in cost_types:
            plot_cost_for_actor(conn, modes, actor, cost_type, output_dir)

def plot_cost_for_actor(conn, modes, actor, cost_type, output_dir):
    where1 = "WHERE actor='{}' AND type='{}'".format(actor, cost_type)
    possible_actions = get_value_set(conn, 'action', where1)
    if(len(possible_actions) == 0):
        return
    plot_file = '{}/{}_{}.png'.format(output_dir, actor, cost_type)
    title = '{}-cost for {}'.format(cost_type, actor)
    plot_cost_for_actionset(conn, modes, actor, possible_actions, cost_type, title, plot_file)

def plot_cost_for_actionset(conn, modes, actor, possible_actions, cost_type, title, plot_file, w=2):
    where1 = "WHERE actor='{}' AND type='{}'".format(actor, cost_type)
    ind = np.arange(len(modes))    # the x locations for the groups
    width = 0.35       # the width of the bars: can also be len(x) sequence
    cumulative_cost= [0 for mode in modes]
    units = get_value_set(conn, 'unit', where1) 
    if len(units) != 1:
        return
    unit = units[0]
    bars=[]
    fig1, ax1 = plt.subplots()
    fig1.set_size_inches(4, w)
    ax1.yaxis.set_major_locator(MaxNLocator(integer=True))
    for action in possible_actions:
        where2 = "WHERE actor='{}' AND type='{}' AND action='{}'".format(actor, cost_type, action)
        action_cost_per_mode_dir = get_value_dir(conn, 'mode', 'avg_value', where2)
        action_variance_per_mode_dir = get_value_dir(conn, 'mode', 'variance', where2)
        action_cost_per_mode_list = [action_cost_per_mode_dir.get(mode, 0) for mode in modes]
        action_variance_per_mode_list = [action_variance_per_mode_dir.get(mode, 0) for mode in modes]
        action_std_per_mode_list = map(math.sqrt, action_variance_per_mode_list)
        bars.append(ax1.bar(ind, action_cost_per_mode_list, width,bottom=cumulative_cost, yerr=action_std_per_mode_list))
        for i, action_cost in enumerate(action_cost_per_mode_list):
            cumulative_cost[i] += action_cost
    if title :
        ax1.set_title(title)
    ax1.set_ylabel('{}-cost in {}'.format(cost_type, unit))
    ax1.set_xticks(ind)
    ax1.set_xticklabels(modes)
    ax1.set_xlabel('Mode')
    ax1.legend(map(lambda bar : bar[0], bars), possible_actions)
    fig1.savefig(plot_file)


def get_value_dir(conn, key_column, value_column, where=''):
    statement = 'SELECT {}, {} FROM Final '.format(key_column, value_column)+where
    cursor = conn.execute(statement)
    return {val[0]:val[1] for val in cursor}

def get_value_set(conn, column, where=''):
    statement = 'SELECT DISTINCT {} FROM Final '.format(column)+where
    cursor = conn.execute(statement)
    return [val[0] for val in cursor]

if __name__ == '__main__':
    if(len(sys.argv) < 3):
        print('you need to give the path of the db and the output dir')
        exit(1)
    modes = ['onchain', 'unverified', 'zokrates']
    db_path = sys.argv[1]
    output_dir = sys.argv[2]
    conn = sqlite3.connect(db_path)
    # make_cost_by_actor_plots(conn, modes, output_dir)
    plot_cost_for_actionset(conn, modes, 'owner', ['holder deployment', 'requester deployment', 'verifier deployment'], 'time', '', output_dir+'/deployment_time.png', 2.8)
    # plot_cost_for_actionset(conn, ['zokrates'], 'trusted 3rd party', ['key generation','verifier deployment'], 'time', 'Time to setup the verification', output_dir+'/setup_time.png')
    plot_cost_for_actionset(conn, modes, 'owner', ['holder deployment', 'requester deployment', 'verifier deployment'], 'gas', '', output_dir+'/deployment_gas.png')
    # plot_cost_for_actionset(conn, ['zokrates'], 'trusted 3rd party', ['verifier deployment'], 'gas', 'Gas used to setup the verification', output_dir+'/setup_gas.png')
    plot_cost_for_actionset(conn, modes, 'owner', ['proof','answer'], 'time', '', output_dir+'/answer_time.png')
    plot_cost_for_actionset(conn, modes, 'owner', ['answer'], 'gas', '', output_dir+'/answer_gas.png')
    plot_cost_for_actionset(conn, modes, 'user', ['request'], 'time', '', output_dir+'/request_time.png')
    plot_cost_for_actionset(conn, modes, 'user', ['request'], 'gas', '', output_dir+'/request_gas.png')
    conn.close()