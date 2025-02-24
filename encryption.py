from cryptography.fernet import Fernet

# Generate initial key

def encrypt(message: str) -> bytes:
    """
    Encrypt a message using the current key.

    Parameters:
        message (str): The message to be encrypted.

    Returns:
        bytes: The encrypted message as bytes.
    """

    with open("key.key", "rb") as f:
        key = bytes(f.read())

    f = Fernet(key)
    return f.encrypt(message.encode())

def decrypt(message: bytes) -> str:
    """
    Decrypt a message using the current key.

    Parameters:
        message (bytes): The encrypted message to be decrypted.

    Returns:
        str: The decrypted message as a string.
    """

    with open("key.key", "rb") as f:
        key = bytes(f.read())

    return Fernet(key).decrypt(message).decode()

def reencrypt(message: bytes):
    """
    Re-encrypt data using a new key after decrypting with the old key.

    Parameters:
        message (bytes): The encrypted data to be re-encrypted.
        old_key (bytes): The key used to decrypt the data.

    Returns:
        tuple: A tuple containing the re-encrypted data and the new key.
    """

    with open("key.key", "rb") as f:
        old_key = bytes(f.read())

    old_fernet = Fernet(old_key)
    decrypted_data = old_fernet.decrypt(message)

    new_fernet = Fernet.generate_key()
    new_data = Fernet(new_fernet).encrypt(decrypted_data)
    key = new_fernet

    with open("key.key", "wb") as f:
        f.write(key)

    return new_data