// Reference data seeded into PostgreSQL on startup (safe to re-run).
// Commands are upserted by name, missions by title; platforms only when the table is empty.

const c = (name, category, risk, syntax, description, hindi, example, sample_output, flags, mistakes) =>
  ({ name, category, risk, syntax, description, hindi, example, sample_output, flags, mistakes });

const FM = 'File and directory management';
const PERM = 'File permissions';
const USR = 'Users and groups';
const PROC = 'Processes and services';
const MON = 'System monitoring';
const NET = 'Networking';
const PKG = 'Package management';
const TXT = 'Text processing';
const LOG = 'Logs and troubleshooting';
const SH = 'Shell scripting';

export const COMMAND_CATEGORIES = [FM, PERM, USR, PROC, MON, NET, PKG, TXT, LOG, SH];

export const COMMANDS = [
  c('ls', FM, 'Safe', 'ls [options] [path]',
    'Lists the files and folders inside a directory.',
    'Ye command batati hai ki kisi folder ke andar kaun-kaun si files aur folders hain.',
    'ls -lah ~/projects',
    `total 20K
drwxr-xr-x  3 dev dev 4.0K Oct 12 10:02 .
drwxr-x--- 12 dev dev 4.0K Oct 12 09:58 ..
-rw-r--r--  1 dev dev  220 Oct 12 10:02 notes.txt
drwxr-xr-x  2 dev dev 4.0K Oct 11 18:40 labs`,
    `-l: long format (permissions, owner, size, date)
-a: include hidden files (names starting with a dot)
-h: human-readable sizes (K, M, G)
-t: sort by modification time, newest first`,
    'Forgetting -a, so hidden files such as .ssh or .bashrc do not appear. Colors in the output depend on your terminal.'),

  c('pwd', FM, 'Safe', 'pwd [-L | -P]',
    'Prints the full path of the directory you are currently in.',
    'Aap abhi kis folder mein ho, ye command wahi batati hai.',
    'pwd',
    '/home/dev/projects',
    `-P: print the physical path (symbolic links resolved)
-L: print the logical path (default)`,
    'Assuming a relative path works from anywhere. Relative paths always start from the current directory.'),

  c('mkdir', FM, 'Safe', 'mkdir [options] directory...',
    'Creates one or more new directories.',
    'Naya folder banane ke liye is command ka use hota hai.',
    'mkdir -p labs/linux/day1 && ls labs/linux',
    'day1',
    `-p: create parent directories as needed, no error if it already exists
-v: print a message for each created directory
-m MODE: set permissions at creation time`,
    'Forgetting -p for a nested path gives "No such file or directory". Names with spaces need quotes.'),

  c('cp', FM, 'Caution', 'cp [options] source... destination',
    'Copies files or directories. An existing destination file is overwritten without warning by default.',
    'File ya folder ki copy banata hai. Agar destination mein same naam ki file ho to wo bina poochhe overwrite ho sakti hai.',
    'cp -riv labs labs_backup',
    `'labs' -> 'labs_backup'
'labs/day1.md' -> 'labs_backup/day1.md'`,
    `-r: copy directories recursively (required for folders)
-i: ask before overwriting
-v: verbose, show what is copied
-p: preserve mode, owner and timestamps`,
    'Forgetting -r on a directory ("omitting directory"). Accidentally overwriting a file because -i was not used.'),

  c('mv', FM, 'Caution', 'mv [options] source... destination',
    'Moves or renames files and directories. An existing destination file is replaced.',
    'File ko ek jagah se doosri jagah le jaata hai ya uska naam badal deta hai.',
    'mv -i draft.txt final.txt',
    `(no output when it succeeds)
# if final.txt exists:
mv: overwrite 'final.txt'?`,
    `-i: ask before overwriting
-n: never overwrite an existing file
-v: verbose`,
    'Moving onto an existing file replaces it. Moving between disks copies then deletes, which can be slow for large data.'),

  c('rm', FM, 'Destructive', 'rm [options] file...',
    'Permanently deletes files or directories. There is no recycle bin and no undo.',
    'File ko hamesha ke liye delete karta hai. Recycle Bin nahi hota, isliye chalane se pehle path dobara check karo.',
    'rm -i old_notes.txt',
    `rm: remove regular file 'old_notes.txt'? y`,
    `-i: prompt before every removal
-r: remove directories and their contents recursively
-f: force, never prompt, ignore missing files
-v: verbose`,
    'rm -rf with a wrong path or an empty/unquoted variable can erase huge parts of a system. Run ls on the same path first and never use -rf out of habit.'),

  c('find', FM, 'Caution', 'find [path] [tests] [actions]',
    'Searches a directory tree for files by name, type, size or time. Actions such as -exec and -delete can change or remove files.',
    'Folder ke andar naam, size ya date ke hisaab se files dhoondhta hai.',
    'find ~/labs -type f -name "*.log" -mtime -7',
    `/home/dev/labs/dns/lookup.log
/home/dev/labs/linux/session.log`,
    `-name PATTERN: match file name (case-sensitive); -iname ignores case
-type f|d: files or directories
-mtime -7: modified in the last 7 days
-size +10M: larger than 10 MB
-exec CMD {} +: run a command on the matches
-delete: delete matches (dangerous)`,
    'Not quoting patterns, so the shell expands them first. Putting -delete before the tests deletes more than you intended because tests are evaluated in order.'),

  c('chmod', PERM, 'Caution', 'chmod [options] mode file...',
    'Changes read, write and execute permissions for owner, group and others.',
    'File ko kaun padh sakta hai, likh sakta hai ya chala sakta hai, ye permission badalta hai.',
    'chmod 640 secrets.txt && ls -l secrets.txt',
    '-rw-r----- 1 dev dev 24 Oct 12 10:10 secrets.txt',
    `Symbolic: u/g/o/a = user/group/others/all, + - = add/remove, r w x (e.g. chmod u+x script.sh)
Numeric: r=4, w=2, x=1 and you add them (7=rwx, 6=rw-, 4=r--)
-R: apply recursively`,
    'chmod -R 777 makes everything world-writable, a serious security mistake. Running a recursive chmod from the wrong directory can break applications.'),

  c('chown', PERM, 'Caution', 'sudo chown [options] owner[:group] file...',
    'Changes the owner and/or group of files. Usually needs administrator (sudo) rights.',
    'File ka malik (owner) aur group badalta hai. Aam taur par sudo chahiye hota hai.',
    'sudo chown dev:dev report.txt && ls -l report.txt',
    '-rw-r--r-- 1 dev dev 1204 Oct 12 10:20 report.txt',
    `-R: change recursively
-v: verbose
-h: change the symbolic link itself, not its target`,
    'A recursive chown on system directories (for example /etc or /) can break the system. Wrong ownership on SSH keys leads to "bad permissions" errors.'),

  c('id', USR, 'Safe', 'id [options] [user]',
    'Shows your user ID, primary group and all group memberships.',
    'Aapki user ID aur aap kin groups mein ho, ye dikhata hai.',
    'id',
    'uid=1000(dev) gid=1000(dev) groups=1000(dev),27(sudo),998(docker)',
    `-u: only the user ID
-g: only the primary group ID
-G: all group IDs
-n: show names instead of numbers (with -u, -g, -G)`,
    'Group changes only take effect after you log out and in again. uid 0 is root.'),

  c('sudo', USR, 'Caution', 'sudo [options] command',
    'Runs one command with administrator (root) privileges after you enter your own password.',
    'Ek command ko admin (root) ke adhikar ke saath chalata hai. Dhyan se use karo.',
    'sudo whoami',
    'root',
    `-l: list what you are allowed to run
-u USER: run as another user instead of root
-i: start a root login shell (avoid unless necessary)`,
    'Adding sudo to everything "to make it work" can create root-owned files in your home folder. Never run scripts you do not understand with sudo.'),

  c('useradd', USR, 'Caution', 'sudo useradd [options] username',
    'Creates a new user account. On Debian/Ubuntu, the friendlier adduser command also exists.',
    'Naya user account banata hai. Admin (sudo) permission chahiye.',
    'sudo useradd -m -s /bin/bash analyst1 && id analyst1',
    'uid=1001(analyst1) gid=1001(analyst1) groups=1001(analyst1)',
    `-m: create the home directory
-s SHELL: set the login shell
-G GROUPS: add to supplementary groups
-c TEXT: comment / full name`,
    'Forgetting -m (no home directory). The new account has no password until you run passwd. Adding users to the sudo group casually weakens security.'),

  c('ps', PROC, 'Safe', 'ps [options]',
    'Shows a snapshot of running processes.',
    'Abhi system mein kaun-kaun si processes chal rahi hain, uski list dikhata hai.',
    'ps aux | head -3',
    `USER   PID %CPU %MEM    VSZ   RSS TTY   STAT START TIME COMMAND
root     1  0.0  0.1 168936 11840 ?     Ss   09:01 0:02 /sbin/init
dev   2041  0.3  0.8 745212 64200 ?     Sl   09:15 0:12 node server/index.js`,
    `a: processes of all users with a terminal
u: user-oriented format (CPU, memory)
x: include processes without a terminal
-ef: the POSIX-style alternative (all processes, full format)`,
    'Mixing the BSD style (ps aux) with the POSIX style (ps -ef). "ps aux | grep name" also lists the grep process itself.'),

  c('kill', PROC, 'Caution', 'kill [-signal] PID...',
    'Sends a signal to a process. By default it asks the process to stop politely (SIGTERM).',
    'Kisi process ko band hone ka signal bhejta hai. Pehle PID ps se confirm karo.',
    'kill 2041',
    '(no output when it succeeds)',
    `-15 (SIGTERM): polite stop, the default
-9 (SIGKILL): forced stop, no cleanup possible
-l: list available signals`,
    'Jumping straight to -9 prevents clean shutdown and can corrupt data. Killing the wrong PID or critical system services.'),

  c('systemctl status', PROC, 'Safe', 'systemctl status service',
    'Shows whether a systemd service is running and its latest log lines. Other subcommands (start, stop, restart) change state and need sudo.',
    'Kisi service (jaise ssh) ka status batata hai: chal rahi hai ya band.',
    'systemctl status ssh --no-pager',
    `● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled)
     Active: active (running) since Mon 2026-10-12 09:01:12 IST; 1h ago
   Main PID: 812 (sshd)`,
    `status: show state
start / stop / restart: change state (sudo)
enable / disable: start or not at boot
--no-pager: print without the pager`,
    'Service names differ by distribution (ssh vs sshd). Stopping or restarting the SSH service on a remote server can lock you out.'),

  c('top', MON, 'Safe', 'top [options]',
    'Shows live CPU, memory and process usage. Press q to quit.',
    'System ki live CPU aur memory usage dikhata hai. Band karne ke liye q dabao.',
    'top',
    `top - 10:42:11 up  1:41,  1 user,  load average: 0.15, 0.20, 0.18
Tasks: 187 total,   1 running, 186 sleeping
%Cpu(s):  2.1 us,  0.7 sy,  0.0 ni, 97.0 id
MiB Mem :   7843.2 total,   3120.4 free,   2510.8 used`,
    `Inside top: q quit, M sort by memory, P sort by CPU, k kill a PID (it prompts)
-u USER: show one user's processes
-d SECONDS: refresh delay`,
    'Reading only the "free" memory number (Linux uses spare RAM as cache). Pressing k and typing the wrong PID.'),

  c('df', MON, 'Safe', 'df [options] [path]',
    'Shows free and used disk space per filesystem.',
    'Disk mein kitni jagah bhari hai aur kitni khaali hai, ye batata hai.',
    'df -h',
    `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2        98G   41G   53G  44% /
tmpfs           3.9G     0  3.9G   0% /dev/shm`,
    `-h: human-readable sizes
-T: show filesystem type
-i: show inode usage instead of blocks`,
    'Confusing df (filesystem free space) with du (space used by a directory). A disk can also be "full" because it ran out of inodes.'),

  c('free', MON, 'Safe', 'free [options]',
    'Shows RAM and swap usage.',
    'RAM aur swap memory ki jaankari deta hai.',
    'free -h',
    `               total        used        free      shared  buff/cache   available
Mem:           7.7Gi       2.4Gi       3.0Gi       120Mi       2.3Gi       5.0Gi
Swap:          2.0Gi          0B       2.0Gi`,
    `-h: human-readable
-m: megabytes
-s N: repeat every N seconds`,
    'Looking at "free" instead of "available". Cached memory is reclaimed when applications need it.'),

  c('ip addr', NET, 'Safe', 'ip addr show [dev INTERFACE]',
    'Shows IP and MAC addresses of your network interfaces. (Subcommands add/del change live settings and need sudo.)',
    'Aapke network interfaces ke IP aur MAC address dikhata hai. Purana ifconfig ab deprecated hai.',
    'ip -br addr',
    `lo               UNKNOWN        127.0.0.1/8 ::1/128
wlan0            UP             192.168.1.23/24 fe80::3e52:82ff:feaa:bbcc/64`,
    `-br: brief, one line per interface
-4 / -6: only IPv4 or IPv6
ip link: show link-layer (MAC) details`,
    'Using ip addr add/del on a remote machine can cut your own connection. These changes are temporary until reboot unless saved in the network config.'),

  c('ip route', NET, 'Safe', 'ip route show',
    'Shows the routing table, including your default gateway. (add/del change network settings.)',
    'Aapka routing table dikhata hai, jisme default gateway bhi hota hai.',
    'ip route show',
    `default via 192.168.1.1 dev wlan0 proto dhcp metric 600
192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.23`,
    `get IP: show which route would be used for that IP
add / del: change routes (sudo, can break connectivity)`,
    'Deleting the default route removes internet access. Avoid changing routes on a remote server you reach over SSH.'),

  c('ping', NET, 'Safe', 'ping [options] host',
    'Sends ICMP echo requests to check reachability and round-trip time.',
    'Check karta hai ki doosra computer network par reach ho raha hai ya nahi, aur kitna time lag raha hai.',
    'ping -c 4 example.com',
    `PING example.com (203.0.113.10) 56(84) bytes of data.
64 bytes from 203.0.113.10: icmp_seq=1 ttl=56 time=24.1 ms
64 bytes from 203.0.113.10: icmp_seq=2 ttl=56 time=23.8 ms
--- example.com ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`,
    `-c N: send N packets then stop
-i SECONDS: interval between packets
-s SIZE: payload size
-4 / -6: force IPv4 or IPv6`,
    'No reply does not always mean the host is down: ICMP is often blocked. Without -c, ping runs until Ctrl+C. Only test hosts you are allowed to test. (Sample output; your addresses will differ.)'),

  c('ss', NET, 'Safe', 'ss [options]',
    'Lists network sockets: which ports your machine is listening on and what connections exist.',
    'Aapki machine kaun-kaun se ports par sun rahi hai aur kaun si connections chal rahi hain, ye dikhata hai.',
    'sudo ss -tulpn',
    `Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
tcp   LISTEN 0      128    0.0.0.0:22         0.0.0.0:*         users:(("sshd",pid=812,fd=3))
tcp   LISTEN 0      244    127.0.0.1:5432     0.0.0.0:*         users:(("postgres",pid=990,fd=6))`,
    `-t / -u: TCP / UDP
-l: listening sockets only
-p: show the owning process (needs sudo for other users)
-n: numeric ports, no name lookups
-a: all sockets`,
    '0.0.0.0 means reachable on every interface, 127.0.0.1 means local only. A database listening on 0.0.0.0 may be exposed more than you intend.'),

  c('dig', NET, 'Safe', 'dig [@server] name [type] [options]',
    'Queries DNS servers and shows the full answer. Great for learning how DNS works.',
    'DNS se naam ka IP ya doosre records poochhta hai. DNS samajhne ke liye bahut useful.',
    'dig example.com A +noall +answer',
    'example.com.   3600  IN  A  203.0.113.10',
    `+short: only the answer value
+trace: follow delegation from the root servers
@8.8.8.8: ask a specific resolver
-x IP: reverse lookup`,
    'Forgetting that results can be cached (check the TTL). dig may not be installed by default (package dnsutils or bind-utils). Sample output; real values differ.'),

  c('curl', NET, 'Safe', 'curl [options] URL',
    'Makes HTTP/HTTPS requests from the terminal. Useful to inspect status codes, headers and responses.',
    'Terminal se website ya API ko request bhejta hai aur response dikhata hai.',
    'curl -I https://example.com',
    `HTTP/2 200
content-type: text/html; charset=UTF-8
cache-control: max-age=604800`,
    `-I: fetch headers only (HEAD request)
-i: include response headers
-v: verbose (TLS and request details)
-L: follow redirects
-o FILE: save to a file
-H "Name: value": add a request header
-k: skip TLS verification (insecure, avoid)`,
    'Using -k to "fix" certificate errors hides real problems. Piping curl straight into a shell (curl | sudo bash) runs unreviewed code. Only test sites you own or are authorized to test.'),

  c('apt update', PKG, 'Caution', 'sudo apt update',
    'Refreshes the list of available packages (Debian/Ubuntu). It does not install or upgrade anything.',
    'Package list ko refresh karta hai. Ye kuch install ya upgrade nahi karta. Sudo chahiye.',
    'sudo apt update',
    `Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
Reading package lists... Done
12 packages can be upgraded. Run 'apt list --upgradable' to see them.`,
    `apt list --upgradable: show pending updates
sudo apt upgrade: actually install updates
(Fedora/RHEL use dnf instead of apt)`,
    'Thinking "update" means "upgrade". "Could not get lock" appears when another package manager is running.'),

  c('apt install', PKG, 'Caution', 'sudo apt install [options] package...',
    'Installs software packages from your distribution repositories (Debian/Ubuntu).',
    'Software package install karta hai. Sudo chahiye. Unknown sources se install karne se bacho.',
    'sudo apt install --dry-run dnsutils',
    `Reading package lists... Done
The following NEW packages will be installed:
  bind9-dnsutils dnsutils
Inst bind9-dnsutils (...)`,
    `--dry-run (-s): simulate only
-y: assume yes (skips the confirmation)
apt remove / purge: uninstall
apt search WORD: find packages`,
    'Using -y without reading what will change. Adding unknown third-party repositories (PPAs) which run with root-level trust.'),

  c('grep', TXT, 'Safe', 'grep [options] pattern [file...]',
    'Searches text for lines that match a pattern.',
    'File ya output mein se woh lines nikalta hai jisme aapka word ya pattern ho.',
    'grep -in "error" app.log',
    '14:2026-10-12 10:01:07 ERROR Database connection refused',
    `-i: ignore case
-n: show line numbers
-r: search directories recursively
-v: invert, show non-matching lines
-c: count matching lines
-E: extended regular expressions
-A N / -B N: show N lines after / before`,
    'Forgetting quotes around patterns with spaces or special characters. Using -r on a huge directory without limiting the path.'),

  c('sort | uniq -c', TXT, 'Safe', 'sort file | uniq -c | sort -nr',
    'Counts how many times each line appears and ranks them. A classic way to summarise logs.',
    'Har line kitni baar aayi, ye ginta hai aur sabse zyada wali ko upar dikhata hai.',
    `cut -d' ' -f1 access.log | sort | uniq -c | sort -nr | head -3`,
    `  412 203.0.113.7
   98 198.51.100.4
   55 192.0.2.19`,
    `sort -n: numeric sort; -r: reverse; -u: unique
uniq -c: prefix counts (input must be sorted)
cut -d' ' -f1: take the first space-separated field`,
    'uniq only collapses adjacent identical lines, so you must sort first. Without -n, "100" sorts before "20".'),

  c('wc', TXT, 'Safe', 'wc [options] [file...]',
    'Counts lines, words and bytes.',
    'Lines, words aur bytes ki ginti karta hai.',
    'wc -l /etc/passwd',
    '38 /etc/passwd',
    `-l: lines
-w: words
-c: bytes
-m: characters`,
    'wc -l counts newline characters, so a last line without a newline is not counted. Reading from stdin (cat file | wc -l) omits the file name.'),

  c('journalctl', LOG, 'Safe', 'journalctl [options]',
    'Reads logs collected by systemd. You may need sudo or group membership to see everything.',
    'systemd ke logs padhne ke liye. Sab logs dekhne ke liye sudo ya sahi group chahiye.',
    'journalctl -u ssh --since "1 hour ago" -n 5',
    `Oct 12 10:12:44 lab-vm sshd[2210]: Accepted publickey for dev from 192.168.1.50 port 51322 ssh2
Oct 12 10:15:02 lab-vm sshd[2305]: Failed password for invalid user admin from 203.0.113.9 port 40122 ssh2`,
    `-u UNIT: one service
-f: follow live
--since / --until: time range
-p err: only error priority and worse
-b: current boot only
-n N: last N lines`,
    'Logs may be cleared on reboot if the journal is not persistent. Mixing up time zones when correlating events.'),

  c('tail -f', LOG, 'Safe', 'tail [-n N] -f file',
    'Shows the end of a file and keeps printing new lines as they are added. Press Ctrl+C to stop.',
    'File ke aakhri lines dikhata hai aur nayi lines aate hi live dikhata rehta hai.',
    'sudo tail -n 3 -f /var/log/auth.log',
    `Oct 12 10:30:01 lab-vm CRON[3011]: pam_unix(cron:session): session opened for user root
Oct 12 10:30:01 lab-vm CRON[3011]: pam_unix(cron:session): session closed for user root`,
    `-n N: start with the last N lines
-f: follow the file
-F: follow even if the file is rotated or recreated`,
    'Using -f on a log that gets rotated, so it stops updating (use -F). The authentication log is /var/log/auth.log on Debian/Ubuntu but /var/log/secure on RHEL/Fedora.'),

  c('shell variables', SH, 'Safe', 'NAME=value   then   "$NAME"',
    'Stores a value in a variable and reuses it in commands and scripts.',
    'Variable mein value save karke baad mein use karte hain. = ke dono taraf space nahi hona chahiye.',
    `name="Operator"
echo "Hello, $name"
echo "Today is $(date +%F)"`,
    `Hello, Operator
Today is 2026-10-13`,
    `$VAR: use the value (quote it: "$VAR")
$(command): insert a command's output
export NAME: make it visible to child processes
Single quotes stop expansion, double quotes allow it`,
    'Spaces around = (name = value fails). Leaving variables unquoted so values with spaces break the command.'),

  c('for loop', SH, 'Safe', 'for x in list; do commands; done',
    'Repeats commands for each item in a list, such as every file matching a pattern.',
    'Ek hi kaam ko kai files ya values par baar-baar chalane ke liye loop.',
    `for f in *.log; do
  echo "$f: $(wc -l < "$f") lines"
done`,
    `auth.log: 120 lines
app.log: 48 lines`,
    `for x in a b c: loop over words
for i in $(seq 1 5): numbers 1 to 5
break / continue: leave or skip an iteration`,
    'Unquoted "$f" breaks on file names with spaces. If no file matches *.log, the loop runs once with the literal text *.log. Forgetting done.'),

  c('if / [ ]', SH, 'Safe', 'if [ condition ]; then ...; else ...; fi',
    'Runs different commands depending on a condition, for example whether a file exists.',
    'Condition ke hisaab se alag-alag commands chalata hai, jaise file hai ya nahi.',
    `if [ -f "$HOME/.ssh/id_ed25519" ]; then
  echo "SSH key found"
else
  echo "No SSH key yet"
fi`,
    'No SSH key yet',
    `-f: file exists; -d: directory exists; -z: string is empty
-eq -lt -gt: compare numbers; = and != compare strings
[[ ... ]]: bash's extended test`,
    'Missing the spaces inside [ ]. Using = to compare numbers. Leaving variables unquoted inside tests.'),
];

export const MISSIONS = [
  ['Map your home directory', 'Run pwd and ls -la, then cd through three folders. Write down what each hidden file or folder is for.', 'Beginner', 15, 'Linux'],
  ['Permissions decoder', 'Create a test file and set it to 600, 644 and 755 with chmod. Explain each ls -l result in your own words.', 'Beginner', 20, 'Linux'],
  ['Who am I on this network?', 'Use ip addr and ip route to find your IP address, subnet and default gateway. Note which are private.', 'Beginner', 15, 'Networking'],
  ['Trace a DNS lookup', 'Use dig to query A, MX and NS records for a public domain. Explain what each answer means.', 'Beginner', 20, 'Networking'],
  ['Read the HTTP headers', 'Run curl -I against a site you own (or example.com). Note the status code and any security headers.', 'Beginner', 15, 'Networking'],
  ['Find the listening ports', 'Run ss -tulpn on your own machine. For each listening port, write which program owns it and whether it should be reachable externally.', 'Intermediate', 20, 'Linux'],
  ['Log detective', 'Take a sample log file and use grep, sort and uniq -c to find the five most frequent source addresses.', 'Intermediate', 30, 'Security Fundamentals'],
  ['Subnet by hand', 'Work out the network address, broadcast address and usable host range for 10.0.5.0/26 without a calculator, then verify.', 'Intermediate', 25, 'Networking'],
  ['Harden SSH on paper', 'List five sshd_config settings that reduce risk and why. This is a review exercise: do not change a live server.', 'Intermediate', 30, 'Security Fundamentals'],
  ['Bash mini-script', 'Write a script that loops over *.log files and prints the line count of each.', 'Beginner', 25, 'Linux'],
  ['Least-privilege thought experiment', 'Draft an IAM-style policy for a user who may only read one storage bucket. List what you deliberately deny.', 'Intermediate', 30, 'Cloud'],
  ['Explain TLS to a friend', 'Write 150 words explaining how a browser decides to trust a website certificate.', 'Beginner', 20, 'Security Fundamentals'],
  ['Packet story', 'On a network you own, capture one page load with Wireshark and identify the DNS query, the TCP handshake and the TLS hello.', 'Advanced', 45, 'Networking'],
  ['Write a lab report', 'Finish one lab entry from this week with observations, mistakes and security lessons filled in.', 'Intermediate', 40, 'Ethical Hacking'],
].map(([title, description, difficulty, est_minutes, category]) => ({ title, description, difficulty, est_minutes, category }));

export const PLATFORMS = [
  ['OverTheWire', 'Free wargames such as Bandit that teach Linux and security concepts through SSH-based puzzles.', 'Beginner', 'https://overthewire.org'],
  ['TryHackMe', 'Guided, browser-based learning rooms and paths. Has free and paid content; check the site for current plans.', 'Beginner', 'https://tryhackme.com'],
  ['Hack The Box Academy', 'Structured cybersecurity courses with hands-on exercises. Some modules are free.', 'Beginner to Intermediate', 'https://academy.hackthebox.com'],
  ['PortSwigger Web Security Academy', 'Free web security training with interactive labs from the makers of Burp Suite.', 'Beginner to Advanced', 'https://portswigger.net/web-security'],
  ['OWASP Juice Shop', 'An intentionally insecure web application you run on your own machine to practice finding web vulnerabilities legally.', 'Intermediate', 'https://owasp.org/www-project-juice-shop/'],
  ['picoCTF', 'Beginner-friendly capture-the-flag platform created by Carnegie Mellon University.', 'Beginner', 'https://picoctf.org'],
].map(([name, description, level, url]) => ({ name, description, level, url }));

// Networking topic slugs. The React app (client/src/data/networking.js) must use the same slugs.
export const NET_TOPICS = [
  'ip-addresses', 'mac-addresses', 'subnets-cidr', 'default-gateway', 'dns', 'dhcp', 'tcp-vs-udp', 'http-https',
  'osi-model', 'tcp-ip-model', 'routing', 'nat', 'firewalls', 'vpn', 'tls-certificates', 'packet-analysis',
];
