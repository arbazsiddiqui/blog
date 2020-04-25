---
date: 2020-04-25
title: 'A Complete Guide to Man in The Middle Attacks'
template: post
thumbnail: '../thumbnails/security.png'
slug: a-complete-guide-to-man-in-the-middle-attacks
categories:
  - Security
tags:
  - attacks
  - MITM
---

## Introduction
Man in the middle (MITM) attacks are the attacks which are carried out by intercepting a communication between two systems. In this attack, the attacker acts as a proxy in between the victim and server (or router). Lets say an attacker is on your wifi, he/she will then use some techniques which we will discuss, to tell your router that I am the victim and tell the victim that I am the router. The victim will then send all the requests to attacker thinking its the router and the router will send all its responses to attacker thinking its the victim. Hence the information which flows to and from victim goes through the attacker. This interception allows attacker to view and even change the information of incoming and outgoing requests. 

A typical MITM attack is a three step process :

1.   **Gaining network access** : Alot of the attacks require the attacker to be on your network in order to become man in the middle. This step comprises of the techniques and attacks required to breach the network and become a part of victim's network.
2.   **Becoming man in the middle** : These are techniques which allows attacker to intercept the communication between client and server. 
3.   **Reading the intercepted data** : After intercepting the data, the data needs to decrypted to plain text in order to gain some meaningful information from it like passwords or credit card information. 

We will look at each of these steps in detail now.

## Gaining network access
Step one of a network MITM attack is to gain access to the victim's network or in simpler term get access to victim's wifi. Hence we will need to understand how its done in order to prevent this from happening. Below are the few ways of gaining access to the network in order to execute MITM.

#### Packet sniffing
Packet sniffing is a way of capturing all the packets which are being sent around using specific wireless devices that are allowed to be put into monitoring mode. These packets don't need to be directed to attacker and the attacker doesn't even need the wifi password to capture these packets. These packets will be encrypted and hence the information being sent inside the packet cant be seen, but attacker will use these packets to try and find a way to determine the key.

#### Cracking WEP networks
Wired Equivalent Privacy (WEP) is a security algorithm for wireless networks. Its an old algorithm and is deprecated by most due to its vulnerabilities, though its still used in some places. In WEP, a new key is generated for each packet being sent across. This key is a 24 bits initialization vector (IV). This key is then added to the password of the network and the resultant key stream is used to encrypt the data that we want to send across the network. As the data is sent in encrypted form, router needs to know the key stream in order to decrypt it. Hence the 24 bits IV is sent in plain text with each packet to the router. Router, who now knows both the IV and the password, uses the key stream to decrypt the packet. 

Their are multiple problems in the above approach which makes WEP weak. First being that IV is sent in plain text. Second, the IV is really small and needs to be generated for each packet thats being sent. The number of packets being sent on a busy network is huge and IVs will start to repeat themselves in no time. Hence if an attacker has captured enough packets using [packet sniffing](#packet-sniffing), he/she can use the repeated IVs to perform some statistical attacks and break the encryption. 

#### Cracking WPA/WPA2 networks
WPA was written keeping the drawbacks of WEP in mind and hence is far more secure algorithm for wireless networks. The packets sent across the network doesn't contain any useful information that can be used to crack them. The key which is sent across with every packet is unique, temporary and much longer, hence even if we sniff alot of WPA encrypted packets we wont be able to crack them by finding patterns. The only packets that can aid in cracking the connection are the handshake packets. These are 4 packets which are transferred between a client and router when a new connection is established. Even these packets dont contain the information which can be used to extract password, however these packets do contain enough information do determine if a given password is valid or not. 

So now we have a black box in which we can enter a password and it will tell if its correct or not. This is all we need to launch a brute force or a dictionary attack i.e. we will try every possible combination of letters or we will try every known common password and pass it to this black box and once we hit the correct one, we will know the password of the wifi. 

#### Evil twin attack
While there are many smart ways of executing a brute force attack to crack a WPA but if the password is strong enough, it can take years before we can crack it. Evil twin attack can be used for such cases. The attacker will first create a new wifi hotspot with same SSID (name) as victim's wifi. It will then launch a de-auth attack on victim's network, resulting in victim being unable to connect to his/her wifi. Victim can then try and connect to an open wifi with same name as his. This is attacker's network, he can setup a captive portal which will ask the user to enter his/her wifi password in the browser. Once the correct password is entered, it is sent to the attacker and the connections are restored. This is a social engineering attack and depends on how convinced the victim is with the attacker's captive portal.

#### Rogue Access Point
This is one of the simplest and ingenious techniques to gain someone's network as this works on the premise of free wifi! The attacker creates an open hotspot for victim to use. Once the victim is connected to the network, well thats it. Attackers don't need to crack the network if they can create one. 

## MITM attacks
Step two for attacker is to intercept the communication and convince victim that he/she is the server/router and similarly convince the router that he/she is the victim. And hence open a two way relay so that all information goes through attacker.

### Types of MITM attack

There are multiple ways of carrying out a MITM attack and be broadly classified into two categories. 
First being attacks that need to be executed on the same network. These attacks can be only carried out if your network is compromised by attacker or in the other words if the attacker is on your wifi or lan. 
Second being the attacks which doesn't require attackers to be on same network and be carried out over the public internet. 

### Network attacks
We discussed in [Gaining network access](#gaining-network-access) section how an attacker can breach your wifi and become a legit part of your network. The reason they want to gain access to your network is in order to launch the actual MITM attack so they can intercept all the data thats being sent and received by you. Below are techniques an attacker can use in order to do so.

#### ARP Spoofing (ARP Cache Poisoning)
Address Resolution Protocol (ARP) allows us to link IP addresses to MAC addresses. Assume there are two devices, device A which has ip address as `10.0.0.1` and device B which has ip address as `10.0.0.2` on the same network. If device A wants to communicate with device B, it needs to know the MAC address of device B. So A uses ARP protocol and broadcasts an ARP request asking who has the IP `10.0.0.2`. All other devices in the network will ignore this request accept device B which will respond with an ack and also send his MAC address to device A, so that device A now knows tha MAC address of device B and hence can communicate with it. Each device has an ARP table where it lists downs all the IPs on the network with their MAC addresses. You can use `arp -a` to see your ARP table.

If a malicious actor is on your network, he/she can exploit this protocol. Your router is also a device on your network, with an IP and MAC address. When the victim broadcasts IP address of router asking for it to respond and send its MAC address, the attacker will respond with its own MAC address, making the victim believe that the attacker's device is the router. Similarly when the router will broadcast victim's IP asking for its mac address, the attacker will respond with his own MAC address, making the router believe that attacker's device is the victim. Hence all the requests being sent from victim is sent to attacker who can view/modify/block the requests and all the responses being sent from router are sent to attacker who can again view/modify/block the responses. 

#### IP Address Spoofing
IP spoofing means that a computer is pretending to have a different IP address – usually the same address as another machine. On its own, IP spoofing is not enough for a MITM attack. However, an attacker may combine it with TCP sequence prediction.

When two devices on the network connect to one another using TCP/IP, they need to establish a session. They do it using a three-way handshake. During this process, they exchange information called sequence numbers. The sequence numbers are needed for the recipient to recognize further packets. Thanks to sequence numbers, the devices know the order in which they should put the received packets together.

In this situation, the attacker first sniffs the connection (listens in). The attacker learns the sequence numbers, predicts the next one, and sends a packet pretending to be the original sender. If that packet reaches the destination first, the attacker intercepts the connection.

### Public Network attacks
These are the MITM attacks that can be carried out without being on the same network. These are much more complicated to execute and requires alot of expertise and resources.

#### DNS Spoofing (DNS Cache Poisoning)
DNS (Domain Name System) is the system used to translate between IP addresses and symbolic names like www.example.com. This system has two primary elements: nameservers (DNS servers) and resolvers (DNS caches). The nameserver is the source of authoritative information. Usually, there are two or three systems that keep that information for every domain. For example, the IP number for www.example.com is stored on two nameservers: sns.dns.icann.org and noc.dns.icann.org.

Every client uses its local resolver to cache the resolved information. If the cache does not have information on www.example.com, it contacts sns.dns.icann.org and noc.dns.icann.org to get 93.184.216.34. Then, it stores the IP address locally for some time. All the clients that use this resolver get the address from the cache.

A DNS spoofing attack is performed by injecting a fake entry into the local cache. If an attacker does that, all clients connected to this cache get the wrong IP address and connect to the attacker instead. This lets the attacker become a man in the middle.

There are other MITM attacks that can be carried out over the internet like [BGP hijacking](https://en.wikipedia.org/wiki/BGP_hijacking) but are extremely complicated and require a lot of resources to carry out.

## Eavesdropping 
Now that an attacker has intercepted the data being passed, step three is that he/she needs to extract valuable information from it. There are measures in place to stop an attacker from doing so and hence an attacker must over come them. Below are few methods an attacker can use to eavesdrop. 

#### SSL Striping 

Lets say an attacker has carried out an [evil twin attack](#evil-twin-attack) to get your wifi password and then used [ARP spoofing](#arp-spoofing-arp-cache-poisoning) to become a MITM, he will still not be able to view anything in plain text for the websites which uses HTTPS. So any passwords or credit card info sent over HTTPS would come as gibberish to the attacker. However data over HTTP is sent and received in plain text. 

As attackers can modify the response coming from router, they strip out HTTPS version and send back HTTP version to client. So a victim will always see HTTP version of the website even when he/she specifically asks for HTTPS version. 

## Prevention 
The whole point of this article was to safeguard your self against such MITM attacks. With most of us working from our home now, security becomes far more critical. Few of these attacks are nothing more than a few commands on a kali machine and hence can be performed by anyone. Here are few points by which we can prevent such attacks.

* As discussed in [cracking WEP networks](#cracking-wep-networks), WEP wifi networks are really easy to crack. Change your router to use WPA/WPA2 instead of using WES.

* As we have seen in [cracking WPA/WPA2 networks](#cracking-wpawpa2-networks) section that cracking your password depends on how strong your password is, so have a strong password with combination of numbers and special characters. 
  
* [Evil twin](#evil-twin-attack) attack requires you to connect to a different wifi than yours with a same or similar name to your wifi. When connecting to a wifi, check the name to be sure that you are connecting to your own network.

* A lot of us leave the router credentials to default(admin). This can lead to attackers changing your [DNS servers](#dns-spoofing-dns-cache-poisoning) to their malicious servers. Have a strong password on your router as well. 

* As seen in [SSL striping](#ssl-striping) section, HTTPS prevents attackers from having any use of the data even if they manage to capture some. Install some plugins on your browser to always fetch the https version of the website your are using. If the website doesn't have an SSL certificate then don't put any sensitive information on that website.

* Using a VPN will disallows the attacker to decipher the traffic in the VPN as it creates a subnet for secure communication.

* When using public wifi like at a mall or airport, don't do any sensitive activities. 