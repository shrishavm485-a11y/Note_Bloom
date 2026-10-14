// Initial quiz bank (46 questions). Upserted by question text on startup.
const q = (topic, difficulty, text, options, answer, explanation) => ({ topic, difficulty, text, options, answer, explanation, type: options.length === 2 && options[0] === 'True' ? 'true_false' : 'multiple_choice' });
const TF = ['True', 'False'];

export const QUIZ_TOPICS = ['Linux', 'Networking', 'Security Fundamentals', 'Cloud Security'];

export const QUESTIONS = [
  // ---- Linux ----
  q('Linux', 'Beginner', 'Which command lists all files, including hidden ones, in long format?', ['ls -l', 'ls -la', 'ls -h', 'ls -t'], 1, '-l gives the long format and -a includes hidden files (names starting with a dot).'),
  q('Linux', 'Beginner', 'After running chmod 640 report.txt, what access does the file\'s group have?', ['No access', 'Read only', 'Read and write', 'Execute only'], 1, '6 = rw- for the owner, 4 = r-- for the group, 0 = --- for others.'),
  q('Linux', 'Beginner', 'Which command prints the directory you are currently in?', ['whoami', 'pwd', 'cd ..', 'ls'], 1, 'pwd means "print working directory".'),
  q('Linux', 'Beginner', 'sudo asks you to enter the root account\'s password.', TF, 1, 'sudo normally asks for YOUR own password and checks whether you are allowed to run the command as root.'),
  q('Linux', 'Beginner', '"apt update" installs the newest versions of all installed packages.', TF, 1, 'apt update only refreshes the package list. apt upgrade installs updates.'),
  q('Linux', 'Intermediate', 'What is the biggest danger of "rm -rf" on a wrong path?', ['It only deletes hidden files', 'It permanently deletes everything under the path with no recycle bin', 'It moves files to /tmp', 'It asks for confirmation each time'], 1, '-r recurses and -f suppresses prompts, so mistakes are instant and unrecoverable.'),
  q('Linux', 'Intermediate', 'Which command shows listening TCP and UDP sockets with their owning processes?', ['ss -tulpn', 'ls -l /proc', 'ping -t', 'df -h'], 0, 'ss -tulpn: TCP, UDP, listening, process, numeric. Use sudo to see all process names.'),
  q('Linux', 'Intermediate', 'Why does "ps aux | grep nginx" often show an extra line?', ['nginx is running twice', 'The grep process itself matches "nginx"', 'ps duplicates output', 'It lists the kernel'], 1, 'The grep command line contains the word nginx, so grep finds itself.'),
  q('Linux', 'Intermediate', 'Which command follows a log file and prints new lines as they appear?', ['cat -f file', 'tail -f file', 'head -f file', 'less -n file'], 1, 'tail -f follows the end of a file. Use -F if the log is rotated.'),
  q('Linux', 'Intermediate', 'Why must you run sort before uniq -c?', ['uniq cannot read files', 'uniq only collapses adjacent duplicate lines', 'sort removes duplicates itself', 'uniq needs root'], 1, 'Identical lines must be next to each other for uniq to count them together.'),
  q('Linux', 'Intermediate', 'Why is "chmod -R 777 /var/www" a poor idea?', ['It is slower', 'It makes everything readable, writable and executable by everyone', 'It removes the files', 'It only works as root'], 1, '777 gives every user full access, which breaks least privilege and can allow tampering.'),
  q('Linux', 'Advanced', 'Which signal cannot be caught or ignored by a process?', ['SIGTERM (15)', 'SIGINT (2)', 'SIGKILL (9)', 'SIGHUP (1)'], 2, 'SIGKILL is handled by the kernel, so the process gets no chance to clean up.'),
  q('Linux', 'Advanced', 'In a shell script, why quote variables as "$file"?', ['It makes the script faster', 'It prevents word splitting on spaces and globbing', 'It exports the variable', 'It is required for numbers'], 1, 'Unquoted variables are split on whitespace and may expand wildcards, which breaks commands and can be unsafe.'),

  // ---- Networking ----
  q('Networking', 'Beginner', 'Which of these is a private IPv4 address?', ['1.1.1.1', '192.168.4.7', '11.0.0.1', '172.32.1.1'], 1, '192.168.0.0/16 is private. 172.32.x.x is outside the private 172.16.0.0/12 range.'),
  q('Networking', 'Beginner', 'Which port does DNS primarily use?', ['25', '53', '80', '3389'], 1, 'DNS uses port 53 (UDP for most queries, TCP for large answers).'),
  q('Networking', 'Beginner', 'HTTPS can only ever use UDP.', TF, 1, 'HTTPS normally runs over TCP port 443. HTTP/3 uses QUIC over UDP, but "only UDP" is false.'),
  q('Networking', 'Beginner', 'NAT replaces the need for a firewall.', TF, 1, 'NAT translates addresses. It is not a security policy. A firewall is still needed.'),
  q('Networking', 'Beginner', 'What is the default port of SSH?', ['21', '22', '23', '443'], 1, 'SSH defaults to TCP 22, though it can be configured to use another port.'),
  q('Networking', 'Intermediate', 'How many usable host addresses are in a /27 IPv4 subnet?', ['32', '30', '62', '14'], 1, '/27 leaves 5 host bits: 2^5 = 32 addresses minus network and broadcast = 30 usable.'),
  q('Networking', 'Intermediate', 'At which OSI layer does a standard switch mainly operate?', ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 7'], 1, 'A switch forwards frames using MAC addresses at the Data Link layer.'),
  q('Networking', 'Intermediate', 'What is the first message in DHCP?', ['Offer', 'Request', 'Discover', 'Acknowledge'], 2, 'DORA: Discover, Offer, Request, Acknowledge.'),
  q('Networking', 'Intermediate', 'Which protocol maps an IPv4 address to a MAC address on the local network?', ['DNS', 'ARP', 'ICMP', 'BGP'], 1, 'ARP asks "who has this IP?" on the local segment and learns the MAC address.'),
  q('Networking', 'Intermediate', 'What does the default gateway do?', ['Assigns IP addresses', 'Forwards traffic to other networks', 'Encrypts DNS', 'Stores MAC addresses'], 1, 'Packets for destinations outside the local subnet are sent to the default gateway.'),
  q('Networking', 'Advanced', 'Which flag sequence completes a TCP three-way handshake?', ['SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'ACK, SYN, RST', 'FIN, ACK, SYN'], 0, 'Client SYN, server SYN-ACK, client ACK.'),
  q('Networking', 'Advanced', 'When several routes match a destination, which does a router choose?', ['The oldest', 'The longest prefix match (most specific)', 'The shortest prefix', 'A random one'], 1, 'Longest prefix match: a /24 route beats a /8 route for an address in both.'),

  // ---- Security Fundamentals ----
  q('Security Fundamentals', 'Beginner', 'What does the CIA triad stand for?', ['Control, Inspect, Audit', 'Confidentiality, Integrity, Availability', 'Cyber, Internet, Access', 'Certify, Identify, Authorize'], 1, 'Confidentiality, Integrity and Availability are the three core security goals.'),
  q('Security Fundamentals', 'Beginner', 'If you are allowed to test one system, you may also test other systems that look similar.', TF, 1, 'Authorization is specific to a target and scope. Never assume permission carries over.'),
  q('Security Fundamentals', 'Beginner', 'A padlock icon in the browser proves a website is trustworthy.', TF, 1, 'It shows the connection is encrypted and the name matches the certificate, not that the site is honest.'),
  q('Security Fundamentals', 'Beginner', 'Which best describes phishing?', ['A network speed test', 'Tricking people into revealing credentials or running malware', 'A firewall rule', 'A backup method'], 1, 'Phishing uses deceptive messages to manipulate users.'),
  q('Security Fundamentals', 'Intermediate', 'What does the principle of least privilege mean?', ['Everyone is an admin', 'Grant only the access needed for a task, nothing more', 'Use one shared password', 'Remove all logging'], 1, 'Limiting permissions reduces the damage from mistakes and compromised accounts.'),
  q('Security Fundamentals', 'Intermediate', 'Which is reversible with the right key?', ['Hashing', 'Encryption', 'Salting', 'Checksumming'], 1, 'Encryption can be decrypted with a key. Hashes are one-way.'),
  q('Security Fundamentals', 'Intermediate', 'How should an application store user passwords?', ['Plain text', 'Encrypted with one shared key', 'Salted, slow hash such as bcrypt or Argon2', 'Base64 encoded'], 2, 'Salted slow hashes make stolen databases far harder to crack.'),
  q('Security Fundamentals', 'Intermediate', 'What is the most effective defence against SQL injection?', ['Hiding the database port', 'Parameterized queries', 'Longer URLs', 'Disabling cookies'], 1, 'Parameterized queries keep user input separate from SQL code.'),
  q('Security Fundamentals', 'Intermediate', 'Multi-factor authentication combines factors such as:', ['Two passwords', 'Something you know plus something you have or are', 'Two usernames', 'A password and a hint'], 1, 'Different factor types: knowledge, possession, inherence.'),
  q('Security Fundamentals', 'Advanced', 'Which HTTP header tells browsers to use HTTPS only for a site?', ['X-Frame-Options', 'Strict-Transport-Security', 'Content-Length', 'Accept-Language'], 1, 'HSTS (Strict-Transport-Security) instructs browsers to refuse plain HTTP for the domain.'),
  q('Security Fundamentals', 'Advanced', 'Defence in depth means:', ['One very strong control', 'Layering several independent controls', 'Relying on obscurity', 'Disabling monitoring'], 1, 'If one layer fails, others still reduce risk.'),

  // ---- Cloud Security ----
  q('Cloud Security', 'Beginner', 'In IaaS, who is responsible for patching the guest operating system?', ['The cloud provider', 'The customer', 'Nobody', 'The ISP'], 1, 'In IaaS the provider secures the infrastructure; the customer manages the OS and above.'),
  q('Cloud Security', 'Beginner', 'The cloud provider is automatically responsible for your storage bucket permissions.', TF, 1, 'Configuring access controls on your resources is the customer\'s responsibility.'),
  q('Cloud Security', 'Beginner', 'Which of these is an example of SaaS?', ['A virtual machine you manage', 'Microsoft 365', 'A Kubernetes cluster you run', 'A raw block disk'], 1, 'SaaS delivers a complete application; the provider runs almost everything.'),
  q('Cloud Security', 'Beginner', 'The account root user should be used for everyday tasks.', TF, 1, 'Protect the root user with MFA, avoid daily use, and use least-privilege roles instead.'),
  q('Cloud Security', 'Intermediate', 'Which misconfiguration commonly causes cloud data leaks?', ['Enabling MFA', 'A publicly readable storage bucket', 'Using roles', 'Turning on logging'], 1, 'Public buckets with sensitive data have caused many breaches.'),
  q('Cloud Security', 'Intermediate', 'What is the best place to keep database passwords and API keys?', ['In the source code', 'A secrets manager', 'A shared document', 'The web page'], 1, 'Secrets managers provide encryption, access control, rotation and auditing.'),
  q('Cloud Security', 'Intermediate', 'What does a cloud audit trail record?', ['Only CPU usage', 'Who performed which API actions and when', 'Website page views', 'Backups'], 1, 'Audit logs such as CloudTrail record management actions for investigation and compliance.'),
  q('Cloud Security', 'Intermediate', 'A security group or network security group is:', ['A team of analysts', 'Virtual firewall rules controlling traffic to resources', 'A password policy', 'A backup plan'], 1, 'They allow or deny traffic by protocol, port and source/destination.'),
  q('Cloud Security', 'Intermediate', 'Which IAM policy design best follows least privilege?', ['Allow all actions on all resources', 'Allow only needed actions on specific resources', 'Share one admin account', 'Disable policies'], 1, 'Avoid wildcards; scope actions and resources tightly.'),
  q('Cloud Security', 'Advanced', 'Encryption at rest primarily protects against:', ['Application bugs', 'Exposure of data on stolen or improperly accessed storage media', 'Phishing', 'DDoS'], 1, 'It protects stored data, but does not stop an authorized application user from reading it.'),
  q('Cloud Security', 'Advanced', 'What best ensures a backup can actually be used in an incident?', ['Making many copies', 'Regularly testing restores', 'Encrypting only', 'Storing it next to the original'], 1, 'An untested backup is an assumption. Practice restores and keep copies separated.'),
];
