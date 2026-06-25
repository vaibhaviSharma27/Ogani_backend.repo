<!-- Cryptography => Hashing
Encryption =>
Encryption is the process of converting readable data (plaintext) into an unreadable format (ciphertext) using an algorithm and a key. This ensures that even if the data is intercepted, it cannot be understood without the correct decryption key. It is widely used in online banking, secure messaging, email security, and data storage to protect sensitive information.

Decryption =>
Decryption is the reverse process — converting ciphertext back into plaintext using the appropriate key. This allows authorized recipients to access and understand the original data.

<!-- 
The troops are on the way!

ashdj asjhdkjasd  ajshdkjashdkj  ashdkjashkdj


The troops are on the way! -->


asjdhajsdjhasgdhasgdasjdgag => jskahdjkashjdhksajhdkjasd

"The quick brown fox" => sadghgdajshdgjh
"The quick brown fox" => ashgdhsgajdghsg
 -->

 Authenticity

 hashing=>
 Hashing is not encryption, as it is a one-way process that transforms input data into a fixed-size hash value, which cannot be reversed to retrieve the original data.
 In cryptography, hashing algorithms are used to ensure data integrity, detect tampering, and provide secure mechanisms for authentication. A cryptographic hash function is a specialized type of hash function designed to meet stringent security requirements, such as being resistant to preimage attacks, second preimage attacks, and collisions.

 Salting=>
 In cryptography, a salt is a random data added to a password or passphrase before hashing it with a one-way function. This technique enhances security by defending against attacks that use precomputed tables, such as rainbow tables, and by ensuring that identical passwords result in different hash values.

Rainbow attack=>
Rainbow table attacks exploit the fact that hashing algorithms produce the same hash for the same input. Attackers precompute a large database of common passwords and their hash values, known as a rainbow table. When they obtain a database of hashed passwords, they can quickly match these hashes against the table to reveal the original plaintext passwords, bypassing the need for brute-force computation.

Brute force Attack=>
A brute force attack is a trial-and-error technique where attackers attempt every possible password, encryption key, or credential combination until they find the correct one. Unlike exploits that target software vulnerabilities, brute force relies on computing power and automation to guess credentials at high speed.
