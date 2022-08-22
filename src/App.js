import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks'
import { ethers } from 'ethers';
import contractAbi from './utils/contractABI.json';

// Constants
const TWITTER_HANDLE = 'TristanBustillo';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = '.trader';
const CONTRACT_ADDRESS = '0x15d24222e23960655317C36a48b3520BA7aF256f';

const App = () => {
	const [network, setNetwork] = useState('');
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);

	const fetchMints = async () => {
		try {
			const { ethereum } = window
			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum)
				const signer = provider.getSigner()
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer)

				const names = await contract.getAllNames()

				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name)
					const owner = await contract.domains(name)
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log(`MINTS FETCHED ${mintRecords}`)
				setMints(mintRecords)
			}
		} catch (err) {
			console.log(err);
		}
	}

	const connectWallet = async () => {
		try {
			const { ethereum } = window;
			if(!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}
			const accounts = await ethereum.request({method: 'eth_requestAccounts'});
			console.log("Connected account:", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (err) {
			console.log(err);
		}
	}

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;
		if(!ethereum) {
			console.log("Make sure you have MetaMask!");
			return;
		} else {
			console.log("We have the ethereum object", ethereum);

			const accounts = await ethereum.request({method: 'eth_accounts'});

			if(accounts.length !== 0) {
				const account = accounts[0];
				console.log("Found an authorized account:", account);
				setCurrentAccount(account);
			} else {
				console.log("No authorized account!");
			}

			// display wallet address info
			const chainId = await ethereum.request({method: 'eth_chainId'});
			setNetwork(networks[chainId]);

			ethereum.on('chainChanged', handleChainChanged);

			function handleChainChanged(_chainId) {
				window.location.reload();
			}
		}
	}

	const switchNetworks = async () => {
		if(window.ethereum) {
			try {
				// try to switch to mumbai testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881'}], // networks.js for values
				});
			} catch (err) {
				if(err.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: 'Mumbai Matic',
										symbol: 'MATIC',
										decimals: 18
									},
									blockExplorerUrls: ['https://mumbai.polygonscan.com/']
								},
							],
						});
					} catch (err) {
						console.log(err);
					}
				} else {
					alert('MeteMask is not installed.')
				}
			}
		}
	}

	const mintDomain = async () => {
		if(!domain) { return; }
		if(domain.length < 3) {
			alert("Domain must be at least 3 characters long");
			return;
		}
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log('Minting domain ', domain, ' with price ', price);

		try {
			const { ethereum } = window;
			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
				console.log('Going to pop wallet now to pay gas...');

				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				const receipt = await tx.wait();

				if(receipt.status === 1) {
					console.log(`Domain minted! https://mumbai.polygonscan.com/tx/${tx.hash}`);
					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log(`Record set! https://mumbai.polygonscan.com/tx/${tx.hash}`);

					// call fetchmints after 2 seconds
					setTimeout(() => {
						fetchMints()
					}, 2000)

					setRecord('');
					setDomain('');
				} else {
					alert("Transaction failed! Please try again.");
				}
			}
		} catch (err) {
			console.log(err);
		}
	}

	const updateDomain = async () => {
		if(!record || !domain) { return; }
		setLoading(true);
		console.log(`Updating domain ${domain} with record ${record}`);
		try {
			const { ethereum } = window;
			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log(`Record set https://mumbai.polygonscan.com/tx/${tx.hash}`);

				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch(err) {
			console.log(err);
		}
		setLoading(false);
	}

	// Create a function to render if wallet is not connected yet
	const renderNotConnectedContainer = () => (
		<div className='connect-wallet-container'>
			<img src="https://media.giphy.com/media/TjgTIM1RIxguPvHzT2/giphy.gif" alt="Trader gif" />
			<button className="cta-button connect-wallet-button" onClick={connectWallet}>
				Connect Wallet
			</button>
		</div>
	);

	const renderInputForm = () => {
		// If not on Polygon Mumbai Testnet, render "Please connect to Polygon Mumbai Testnet"
		if(network !== 'Polygon Mumbai Testnet') {
			return (
				<div className='connect-wallet-container'>
					<h2>Please switch to Polygon Mumbai Testnet</h2>
					<button className='cta-button mint-button' onClick={switchNetworks}>Click here to switch</button>
					{/* <p>Please connect to the Polygon Mumbai Testnet</p> */}
				</div>
			);
		}
		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='whats your go-to setup'
					onChange={e => setRecord(e.target.value)}
				/>
				{/* If the editing variable is true, return the "Set record" and "Cancel" button */}
				{editing ? (
					<div className="button-container">
						{/* This will call the updateDomain function we just made */}
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set record
						</button>  
						{/* This will let us get out of editing mode by setting editing to false */}
						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
							Cancel
						</button>  
					</div>
				) : (
					// If editing is not true, the mint button will be returned instead
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>  
				)}
			</div>
		);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
				  <p className="subtitle"> Recently minted domains!</p>
				  <div className="mint-list">
					{ mints.map((mint, index) => {
					  return (
						<div className="mint-item" key={index}>
						  <div className='mint-row'>
							<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
							  <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
							</a>
							{/* If mint.owner is currentAccount, add an "edit" button*/}
							{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
							  <button className="edit-button" onClick={() => editRecord(mint.name)}>
								<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
							  </button>
							  :
							  null
							}
						  </div>
					<p> {mint.record} </p>
				  </div>)
				  })}
				</div>
			  </div>);
		}
	}

	const editRecord = (name) => {
		console.log(`Editing record for ${name}`)
		setEditing(true)
		setDomain(name)
	}

	// This runs our function when the page loads.
	useEffect(() => {
		checkIfWalletIsConnected();
	  }, [])

	  useEffect(() => {
		  if(network === 'Polygon Mumbai Testnet') {
			  fetchMints()
		  }
	  }, [currentAccount, network])

  return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
						<p className="title">🐱‍👤 Trader Name Service</p>
						<p className="subtitle">Your immortal API on the blockchain!</p>
						</div>
						{/* Display a logo and wallet connection status*/}
						<div className="right">
							{/* <img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} /> */}
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>
				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}
				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built with @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
