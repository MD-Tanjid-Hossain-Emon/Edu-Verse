const NETWORK_FACTS = {
  html: [
    ['Semantic HTML elements describe the meaning and structure of content.', 'The `<main>` element identifies the primary content of a page.', 'An anchor element with an `href` creates a hyperlink.', 'An image should have useful alternative text when it conveys information.'],
    ['A `<form>` groups controls used to submit user input.', 'A `<label>` associates readable text with a form control.', 'A `<button type="submit">` submits its containing form.', 'The document title is set with the `<title>` element in the head.'],
    ['Headings communicate the outline and hierarchy of page content.', 'The `alt` attribute provides a text alternative for an image.', 'A `<nav>` element identifies a major navigation section.', 'A `<header>` can introduce a page or a section.'],
    ['HTML provides document structure while CSS controls presentation.', 'An `id` should identify one unique element in a document.', 'A `<ul>` represents an unordered list.', 'A `<table>` is intended for tabular data, not general page layout.'],
  ],
  css: [
    ['CSS rules use selectors to target elements and declarations to set styles.', 'The `color` property sets text color.', 'The `font-size` property controls text size.', 'The box model consists of content, padding, border, and margin.'],
    ['Flexbox is designed for arranging items along one dimension.', 'CSS Grid is designed for two-dimensional row and column layouts.', 'A media query applies styles based on viewport or device conditions.', 'The `margin` property creates space outside an element border.'],
    ['The `padding` property creates space between content and its border.', 'A class selector begins with a period.', 'An ID selector begins with a hash symbol.', 'The cascade resolves competing rules using origin, importance, specificity, and order.'],
    ['Responsive design adapts layouts to different viewport sizes.', 'The `display` property controls an element layout mode.', 'The `box-sizing: border-box` model includes padding and border in the set width.', 'A CSS variable can store a reusable custom property value.'],
  ],
  javascript: [
    ['`let` declares a block-scoped variable that can be reassigned.', '`const` declares a block-scoped binding that cannot be reassigned.', 'An array stores an ordered collection of values.', 'An object stores values under named properties.'],
    ['A function packages reusable executable logic.', 'An event listener runs code when a specified event occurs.', 'The DOM represents a web document as objects that JavaScript can inspect and change.', 'Strict equality compares value and type without coercion.'],
    ['A promise represents the eventual result of an asynchronous operation.', 'An `async` function returns a promise.', 'JSON is a text format often used to exchange structured data.', 'A `for...of` loop iterates values from an iterable.'],
    ['A parameter receives a value supplied when a function is called.', 'A template literal uses backticks and can interpolate expressions.', 'A module can export values for use in another file.', 'Client-side validation improves usability but does not replace server-side validation.'],
  ],
  dataScience: [
    ['Data science combines data, programming, statistics, and domain knowledge to answer questions.', 'Exploratory Data Analysis uses summaries and visualizations to understand data.', 'A training dataset is used to fit a predictive model.', 'A test dataset estimates how a model performs on unseen examples.'],
    ['Data cleaning addresses missing, inconsistent, or incorrect values.', 'A median is less sensitive to extreme values than a mean.', 'Correlation describes association and does not by itself prove causation.', 'A chart should use a visual encoding appropriate to the data.'],
    ['A feature is an input variable used by a model.', 'A target is the outcome a supervised model aims to predict.', 'Classification predicts a category.', 'Regression predicts a numeric value.'],
    ['A data scientist communicates methods, assumptions, and limitations.', 'A biased sample can lead to misleading conclusions.', 'A reproducible analysis records the data and steps used.', 'Validation data helps tune a model without using the final test set.'],
  ],
  pythonData: [
    ['A pandas DataFrame stores labeled tabular data in rows and columns.', '`read_csv` loads a comma-separated file into a DataFrame.', '`head()` previews the first rows of a DataFrame.', 'A pandas Series is a one-dimensional labeled array.'],
    ['`isna()` helps identify missing values in pandas.', '`drop_duplicates()` removes duplicate rows.', 'Boolean indexing filters rows using a condition.', '`groupby()` groups rows for aggregation.'],
    ['`loc` selects rows and columns by labels.', '`iloc` selects rows and columns by integer position.', 'A merge combines DataFrames using matching keys.', 'A pivot table summarizes data across categories.'],
    ['A NumPy array supports efficient numerical operations.', 'A Python dictionary stores key-value pairs.', 'A function defined with `def` can be reused.', 'A notebook can combine executable code, results, and explanation.'],
  ],
  cli: [
    ['User EXEC mode provides basic monitoring commands.', 'Privileged EXEC mode provides access to additional show and configuration commands.', 'Global configuration mode changes device-wide settings.', 'Interface configuration mode applies settings to a selected interface.'],
    ['The `enable` command enters privileged EXEC mode.', 'The `configure terminal` command enters global configuration mode.', 'The `show running-config` command displays the active configuration.', 'The `copy running-config startup-config` command saves the active configuration.'],
    ['The `no shutdown` command enables a disabled interface.', 'The `show ip interface brief` command summarizes interface addresses and status.', 'A console connection provides local command-line access.', 'Command completion can be requested with the Tab key on Cisco IOS.'],
    ['The running configuration is stored in RAM.', 'The startup configuration is used when the device boots.', 'A hostname command sets the device name.', 'Configuration changes should be verified with appropriate show commands.'],
  ],
  flashcards: [
    ['Spaced repetition schedules review as a learner is likely to forget information.', 'Active recall asks a learner to retrieve an answer from memory.', 'A focused flashcard tests one clear fact or concept.', 'Reviewing incorrect cards more often helps target weak areas.'],
    ['A flashcard prompt should be specific and unambiguous.', 'Anki is a flashcard application that can schedule reviews.', 'Regular short review sessions can support long-term recall.', 'Understanding a networking concept is more useful than memorizing an unexplained command.'],
    ['A good answer side should explain the key fact clearly.', 'Cards can include commands, protocol behavior, or definitions.', 'Separating related but distinct concepts helps make cards easier to review.', 'Learners can edit a card when it repeatedly causes confusion.'],
    ['Review intervals can increase as a learner recalls a card correctly.', 'Self-testing is more effective for recall than only rereading notes.', 'Examples can help connect a protocol fact to a real network scenario.', 'A flashcard deck should be reviewed consistently.'],
  ],
  devices: [
    ['A router forwards packets between IP networks.', 'A switch forwards Ethernet frames within a LAN.', 'An access point bridges wireless clients to a wired LAN.', 'A firewall filters traffic according to security policy.'],
    ['A switch learns source MAC addresses to build its forwarding table.', 'A router uses a routing table to choose a next hop.', 'An access point advertises a wireless network identifier.', 'A firewall evaluates traffic against configured rules.'],
    ['A router separates broadcast domains by default.', 'A switch creates separate broadcast domains when VLANs are configured.', 'A wireless client associates with an access point.', 'A firewall can restrict traffic between network zones.'],
    ['A router commonly uses IP addresses to make forwarding decisions.', 'An Ethernet switch commonly uses destination MAC addresses to forward frames.', 'An access point bridges wireless and wired network access.', 'A firewall can permit or deny a flow based on its rules.'],
    ['A default gateway is the router a host uses for remote networks.', 'A switch access port normally belongs to one VLAN.', 'A wireless access point connects Wi-Fi clients to a LAN.', 'A firewall policy should allow only required traffic.'],
  ],
  packettracer: [
    ['Cisco Packet Tracer is a network simulator for learning and testing topologies.', 'A simulation lets learners inspect packet movement between devices.', 'A topology should include devices, links, and valid interface configurations.', 'A successful ping checks basic reachability between endpoints.'],
    ['A copper Ethernet link connects compatible Ethernet interfaces.', 'A console connection provides local device management.', 'A router interface needs an IP address and an enabled state to route.', 'A switch port can be assigned to an access VLAN.'],
    ['The simulation mode can display protocol events as packets move.', 'A ping uses ICMP echo messages to test IP reachability.', 'A missing default gateway prevents a host from reaching remote subnets.', 'A shutdown interface must be enabled before it can pass traffic.'],
    ['The logical workspace is used to arrange and configure a network topology.', 'The physical workspace represents device placement and cabling.', 'A link indicator helps identify interface and cabling problems.', 'A saved project preserves the simulated topology and configuration.'],
  ],
  ethernet: [
    ['Ethernet is the common link-layer technology used on wired LANs.', 'An Ethernet frame includes source and destination MAC addresses.', 'A switch learns a source MAC address on the interface where it arrived.', 'A switch forwards a known unicast frame toward the destination port.'],
    ['A MAC address identifies a network interface at the data-link layer.', 'A duplex mismatch can cause poor performance and frame errors.', 'Ethernet switches reduce collisions by giving each port its own collision domain.', 'A broadcast frame is flooded within its VLAN.'],
    ['A trunk link can carry multiple VLANs using 802.1Q tags.', 'An access link typically carries traffic for one data VLAN.', 'An Ethernet cable connects physical network interfaces.', 'Auto-negotiation can determine speed and duplex when both endpoints support it.'],
    ['A switch floods an unknown unicast frame within the same VLAN.', 'A switch does not normally forward a Layer 2 frame between VLANs.', 'The frame check sequence helps detect corrupted Ethernet frames.', 'Full-duplex Ethernet can send and receive simultaneously.'],
  ],
  cabling: [
    ['Copper twisted-pair Ethernet uses RJ-45 connectors on common LAN links.', 'Fiber-optic cabling carries light and supports long-distance links.', 'A console cable provides out-of-band device access.', 'A crossover cable traditionally connects similar Ethernet devices.'],
    ['A straight-through cable traditionally connects different device types.', 'Fiber is resistant to electromagnetic interference.', 'A cable fault can cause link-down status or physical-layer errors.', 'The interface speed must be supported by both ends of a link.'],
    ['LC and SC are common fiber connector types.', 'UTP cable does not have an electromagnetic shield around each pair.', 'A console connection is for management, not ordinary user data forwarding.', 'A properly seated connector is required for a reliable physical link.'],
    ['A fiber transceiver must match the fiber type and link requirements.', 'Copper Ethernet distance is limited by the physical-layer standard.', 'The physical layer transmits bits over the cable or radio medium.', 'Replacing a damaged cable is a direct way to isolate a physical-link fault.'],
  ],
  tcpip: [
    ['The TCP/IP model describes communication using application, transport, internet, and network-access layers.', 'IP provides logical addressing and routing between networks.', 'TCP provides reliable, ordered delivery using acknowledgments and retransmissions.', 'UDP provides connectionless transport with low protocol overhead.'],
    ['Encapsulation adds protocol headers as data moves down the network stack.', 'A router forwards IP packets at the internet/network layer.', 'An Ethernet frame is used to carry an IP packet across a local link.', 'Application protocols rely on lower layers to deliver their data.'],
    ['TCP uses port numbers to identify communicating application processes.', 'IP routing selects a path toward the destination network.', 'The network-access layer covers local-link delivery.', 'A transport protocol operates between applications and IP.'],
    ['The receiving host removes headers as data moves up the protocol stack.', 'DNS is an application-layer name-resolution protocol.', 'An IP packet can cross multiple Layer 2 networks on its path.', 'TCP and UDP are transport-layer protocols.'],
  ],
  osi: [
    ['The OSI reference model has seven layers.', 'Layer 2 is the data-link layer and handles frames and MAC addressing.', 'Layer 3 is the network layer and handles logical addressing and routing.', 'Layer 4 is the transport layer and provides end-to-end transport services.'],
    ['Layer 1 is the physical layer and carries raw bits over a medium.', 'Layer 5 is the session layer.', 'Layer 6 is the presentation layer.', 'Layer 7 is the application layer.'],
    ['Switching based on MAC addresses is commonly associated with Layer 2.', 'Routing based on IP networks is commonly associated with Layer 3.', 'TCP and UDP operate at the transport layer.', 'A cable or signal fault is a physical-layer issue.'],
    ['Encapsulation associates each layer with its own protocol information.', 'A router separates Layer 3 networks.', 'Ethernet defines common Layer 2 LAN framing.', 'The OSI model helps organize and troubleshoot network functions.'],
  ],
  addressing: [
    ['IPv4 addresses are 32 bits long.', 'An IPv4 subnet mask identifies the network and host portions of an address.', 'A default gateway forwards traffic destined for remote networks.', 'An IPv4 address and mask together identify a host subnet.'],
    ['A /24 prefix corresponds to the mask 255.255.255.0.', 'The network address identifies a subnet rather than one host.', 'The directed broadcast address targets all hosts on a subnet.', 'A host address must be valid within its configured subnet.'],
    ['Two hosts need compatible IP addressing to communicate directly on a local subnet.', 'A duplicate IPv4 address can cause intermittent connectivity.', 'A host uses its mask to determine whether a destination is local.', 'The gateway address must be reachable on the local subnet.'],
    ['IPv4 private ranges are reserved for internal networks.', 'ARP resolves an IPv4 address to a local-link MAC address.', 'A subnet mask can also be written as a prefix length.', 'An incorrect mask can cause a host to choose the wrong next hop.'],
  ],
  subnetting: [
    ['A subnet prefix length specifies how many leading bits identify the network.', 'A /24 IPv4 subnet contains 256 total addresses.', 'VLSM assigns different subnet sizes to match host requirements.', 'Subnetting divides a larger IP network into smaller logical networks.'],
    ['A /26 prefix provides 64 total IPv4 addresses per subnet.', 'A /30 prefix provides four total IPv4 addresses.', 'The subnet mask determines which destinations are local.', 'The network and broadcast addresses are not ordinary host addresses on a traditional IPv4 subnet.'],
    ['VLSM planning should allocate larger host requirements before smaller ones.', 'A longer prefix leaves fewer host bits.', 'A shorter prefix contains more addresses.', 'CIDR notation writes a prefix length after a slash.'],
    ['A subnet boundary is determined by the prefix length.', 'Overlapping subnets create ambiguous routing and addressing.', 'A route summarizes multiple networks with a common prefix.', 'The usable host range depends on the subnet size and IPv4 rules.'],
  ],
  routing: [
    ['A router uses its routing table to select a route for a destination IP address.', 'Longest-prefix match selects the most specific matching route.', 'A static route is configured manually by an administrator.', 'A default route is used when no more specific route matches.'],
    ['A next hop identifies where a packet should be sent next.', 'A directly connected route appears when an interface is configured and operational.', 'A routing protocol can exchange routes dynamically.', 'The route administrative distance helps choose between route sources.'],
    ['A routing loop can occur when routers have inconsistent path information.', 'A missing return route can prevent a two-way application session.', 'A route to a remote network needs a valid outgoing interface or next hop.', 'A router decrements the IPv4 TTL while forwarding a packet.'],
    ['A floating static route uses a higher administrative distance as a backup.', 'A more specific route is preferred over a less specific route for the same destination.', 'The routing table contains network prefixes and forwarding information.', 'Traceroute helps identify the Layer 3 path toward a destination.'],
  ],
  vlan: [
    ['A VLAN creates a separate Layer 2 broadcast domain.', 'An access port normally carries traffic for one VLAN.', 'An 802.1Q trunk carries traffic for multiple VLANs.', 'Inter-VLAN communication requires a Layer 3 device or routing function.'],
    ['The VLAN ID identifies a VLAN in an 802.1Q tag.', 'Hosts in different VLANs need routing to communicate.', 'A trunk native VLAN carries untagged traffic by convention.', 'A VLAN can logically group devices independent of physical location.'],
    ['A switch port must belong to the correct VLAN for local Layer 2 connectivity.', 'A trunk allowed-VLAN list limits which VLANs cross a trunk.', 'A mismatch in native VLAN settings can cause traffic and security issues.', 'Separating users into VLANs can reduce broadcast scope.'],
    ['The 802.1Q header tags VLAN identity on trunk traffic.', 'An access port typically sends and receives untagged frames for its VLAN.', 'A Layer 3 switch can route between VLAN interfaces.', 'A VLAN does not by itself encrypt traffic.'],
  ],
  stp: [
    ['Spanning Tree Protocol prevents Layer 2 switching loops.', 'STP elects a root bridge using bridge IDs.', 'A non-root switch selects a root port toward the root bridge.', 'A blocked redundant path helps prevent broadcast storms.'],
    ['BPDUs carry spanning-tree control information.', 'The lowest bridge ID wins the root bridge election.', 'STP converges to a loop-free logical topology.', 'A redundant physical link can remain available as a standby path.'],
    ['Rapid Spanning Tree Protocol provides faster convergence than classic STP.', 'PortFast is intended for edge ports connected to end devices.', 'BPDU Guard protects an edge port by disabling it when a BPDU is received.', 'Root Guard prevents an unexpected switch from becoming root through a protected port.'],
    ['Loop Guard helps prevent a port from incorrectly transitioning to forwarding when BPDUs stop.', 'PVST+ maintains a spanning-tree instance per VLAN.', 'A Layer 2 loop can multiply broadcast traffic.', 'The root bridge is the reference point for spanning-tree path selection.'],
  ],
  security: [
    ['Port security can limit which MAC addresses are allowed on a switch port.', 'DHCP snooping blocks untrusted DHCP server messages on access ports.', 'Dynamic ARP Inspection validates ARP packets using trusted bindings.', 'A strong device password helps prevent unauthorized administrative access.'],
    ['SSH encrypts remote command-line management traffic.', 'An access control list permits or denies traffic based on configured criteria.', 'Least privilege grants only the access needed for a task.', 'A rogue DHCP server can provide clients with malicious network settings.'],
    ['A trusted DHCP snooping interface is normally connected toward an authorized DHCP server.', 'Port-security violation actions can restrict or disable a port.', 'Dynamic ARP Inspection helps mitigate ARP spoofing on a VLAN.', 'Management interfaces should not be exposed more broadly than necessary.'],
    ['A security control should be verified after it is configured.', 'Unused switch ports can be disabled to reduce exposure.', 'AAA centralizes authentication, authorization, and accounting.', 'Security logs help investigate suspicious network activity.'],
  ],
  dhcp: [
    ['DHCP automatically leases IP configuration to clients.', 'The DORA sequence is Discover, Offer, Request, Acknowledge.', 'A DHCP scope defines addresses and options offered to a subnet.', 'A DHCP relay forwards client broadcasts to a remote DHCP server.'],
    ['A DHCP reservation associates a chosen address with a client identifier.', 'A default gateway can be supplied as a DHCP option.', 'DNS server addresses can be supplied in a DHCP lease.', 'A lease has a limited duration and can be renewed.'],
    ['DHCP snooping distinguishes trusted and untrusted switch ports.', 'A DHCP server must have a valid scope for the client VLAN.', 'A client that receives no lease may use an automatic private address.', 'A relay agent enables DHCP across Layer 3 boundaries.'],
    ['The DHCP server selects an available address from its scope.', 'A scope should match the subnet mask and gateway used on that VLAN.', 'A conflicting static address can disrupt DHCP clients.', 'DHCP reduces the need to configure every host manually.'],
  ],
  dns: [
    ['DNS translates domain names into records such as IP addresses.', 'An A record maps a name to an IPv4 address.', 'An AAAA record maps a name to an IPv6 address.', 'A recursive resolver looks up answers on behalf of a client.'],
    ['A CNAME record aliases one name to another name.', 'DNS commonly uses UDP port 53 for ordinary queries.', 'DNS can use TCP port 53 for cases such as large responses and zone transfers.', 'An incorrect DNS server can make names fail while IP connectivity still works.'],
    ['A DNS cache stores answers for their time to live.', 'A PTR record is used for reverse DNS lookup.', 'A DNS zone contains authoritative records for a domain.', 'Name resolution is a separate step from routing to the resulting IP address.'],
    ['A client can test basic IP reachability independently of DNS.', 'The DNS suffix search list can help resolve short hostnames.', 'An NS record identifies authoritative name servers.', 'DNS provides distributed, hierarchical name resolution.'],
  ],
  wireless: [
    ['An SSID identifies a wireless network.', 'An access point bridges wireless clients to a wired network.', 'A wireless client must associate and authenticate before normal network access.', 'The 2.4 GHz band often offers more range but more interference.'],
    ['The 5 GHz band offers additional channels and often higher capacity at shorter range.', 'A channel plan should reduce co-channel and adjacent-channel interference.', 'WPA2 and WPA3 provide stronger wireless security than open access.', 'An omnidirectional antenna radiates across a broad horizontal area.'],
    ['A wireless LAN controller can centrally manage lightweight access points.', 'Roaming allows a client to move between access points in the same WLAN.', 'A hidden SSID is not a substitute for encryption.', 'Radio interference can cause low throughput even when a client is connected.'],
    ['A guest WLAN can isolate visitors from internal resources.', 'The access point and client must support a compatible security mode.', 'Channel width affects spectrum use and potential throughput.', 'Signal strength, noise, and channel utilization affect Wi-Fi performance.'],
  ],
  ipv6: [
    ['IPv6 addresses are 128 bits long.', 'IPv6 uses Neighbor Discovery instead of ARP.', 'The IPv6 loopback address is ::1.', 'A /64 prefix is common for an IPv6 LAN subnet.'],
    ['IPv6 link-local addresses begin with the FE80::/10 range.', 'SLAAC lets a host form an address using router advertisements.', 'DHCPv6 can provide stateful or other configuration information.', 'IPv6 routers do not forward link-local traffic between links.'],
    ['The IPv6 unspecified address is ::.', 'A global unicast address is routable beyond the local link.', 'IPv6 shortens consecutive zero groups using double-colon compression once.', 'Router advertisements communicate IPv6 prefix and gateway information.'],
    ['An IPv6 default route is written as ::/0.', 'A dual-stack network runs IPv4 and IPv6 together.', 'An IPv6 address can be configured manually or learned dynamically.', 'Neighbor Discovery uses ICMPv6 messages.'],
  ],
  acl: [
    ['A standard IPv4 ACL matches the source IPv4 address.', 'An extended IPv4 ACL can match source, destination, protocol, and ports.', 'ACL entries are evaluated in order from top to bottom.', 'An implicit deny exists at the end of an ACL.'],
    ['A wildcard mask identifies which address bits an ACL should ignore.', 'A more specific ACL entry should generally be placed before a broader one.', 'An ACL applied inbound filters traffic as it enters an interface.', 'An ACL applied outbound filters traffic as it leaves an interface.'],
    ['A standard ACL is commonly placed near the destination.', 'An extended ACL is commonly placed near the source.', 'An ACL should include explicit permits for required traffic.', 'An incorrect ACL direction can block traffic unexpectedly.'],
    ['Named ACLs make policy easier to identify and manage.', 'The log keyword can help observe ACL matches.', 'ACLs filter traffic but do not encrypt it.', 'Testing permitted and denied traffic verifies an ACL policy.'],
  ],
  services: [
    ['NTP synchronizes device clocks to a common time source.', 'Syslog sends event messages to a logging server.', 'SNMP monitors and manages network devices.', 'SSH provides encrypted remote terminal access.'],
    ['TFTP transfers files using a simple, connectionless protocol.', 'FTP uses separate control and data connections.', 'CDP discovers directly connected Cisco devices.', 'LLDP is a vendor-neutral neighbor discovery protocol.'],
    ['SNMP polling retrieves management data from an agent.', 'SNMP traps notify a manager about events.', 'Accurate time makes log correlation more reliable.', 'Centralized logging preserves events outside the originating device.'],
    ['SSH typically uses TCP port 22.', 'NTP commonly uses UDP port 123.', 'DNS commonly uses port 53.', 'TFTP commonly uses UDP port 69 to initiate a transfer.'],
  ],
  nat: [
    ['NAT translates IP addresses between address realms.', 'Static NAT maps one inside local address to one inside global address.', 'Dynamic NAT allocates translations from an address pool.', 'PAT allows multiple inside hosts to share one public IPv4 address using port numbers.'],
    ['Inside local identifies an inside host address before translation.', 'Inside global identifies the translated public-side address of an inside host.', 'NAT overload is another name for PAT.', 'An access list can identify which inside addresses are eligible for translation.'],
    ['A missing NAT translation can prevent private hosts from reaching external networks.', 'Static NAT is useful when an inside service needs a consistent public mapping.', 'Dynamic NAT translations can expire when no longer used.', 'Port numbers distinguish multiple PAT sessions using one public address.'],
    ['NAT changes packet address information as traffic crosses a translation boundary.', 'NAT is not a replacement for a firewall security policy.', 'The NAT inside and outside interfaces define translation direction.', 'Show commands can verify active translations and NAT statistics.'],
  ],
  qos: [
    ['QoS prioritizes or manages traffic when network resources are congested.', 'Classification identifies traffic that needs a particular treatment.', 'Marking sets a value such as DSCP to communicate traffic class.', 'Queuing determines how traffic waits for transmission.'],
    ['Policing can drop or remark traffic that exceeds a rate.', 'Shaping buffers traffic to smooth its transmission rate.', 'Voice traffic is sensitive to delay, jitter, and packet loss.', 'A voice VLAN separates IP phone traffic from ordinary data traffic.'],
    ['Congestion is the condition where offered traffic exceeds available capacity.', 'DSCP is a field used for Layer 3 QoS marking.', 'QoS cannot create additional bandwidth.', 'An end-to-end QoS policy requires consistent treatment across the path.'],
    ['Trust boundaries determine which device markings are accepted.', 'Low latency is important for interactive voice and video.', 'A queue scheduler allocates transmission opportunities among traffic classes.', 'QoS counters help verify that policy is matching the intended traffic.'],
  ],
  automation: [
    ['Network automation uses software to configure, operate, or monitor networks.', 'An API provides a defined interface for exchanging data with a system.', 'JSON represents structured data with objects and arrays.', 'YAML is a human-readable format often used for configuration.'],
    ['REST APIs commonly use HTTP methods such as GET, POST, PUT, and DELETE.', 'An HTTP status code indicates the result of an API request.', 'Authentication verifies the identity of an API client.', 'Authorization determines which API operations the authenticated client may perform.'],
    ['A controller can centralize policy and configuration for network devices.', 'Ansible commonly uses playbooks to describe automation tasks.', 'Terraform uses declarative configuration to manage infrastructure state.', 'Idempotent automation can be run repeatedly to reach the same desired state.'],
    ['XML represents structured data using nested elements.', 'Machine learning finds patterns in data but does not replace network engineering judgment.', 'A source-control system tracks changes to automation files.', 'A dry run or validation step can reduce risk before deploying automation.'],
  ],
};

const TOPIC_MATCHERS = [
  [/packet tracer|simulation/i, 'packettracer'],
  [/flashcard|anki/i, 'flashcards'],
  [/html|web page|page structure/i, 'html'],
  [/css|styling|style sheet|layout/i, 'css'],
  [/javascript|interactivity|dom/i, 'javascript'],
  [/data science|exploratory data|\beda\b|machine learning|\bai\b/i, 'dataScience'],
  [/python|pandas|working with data/i, 'pythonData'],
  [/\bcli\b|command line|device configuration/i, 'cli'],
  [/interface|cable|connector|transceiver/i, 'cabling'],
  [/tcp.?ip|packet model/i, 'tcpip'],
  [/osi model/i, 'osi'],
  [/subnet|vlsm/i, 'subnetting'],
  [/ipv6/i, 'ipv6'],
  [/ipv4|address|ip header/i, 'addressing'],
  [/voice vlan|qos/i, 'qos'],
  [/vlan|dtp|vtp|\bsvi\b/i, 'vlan'],
  [/spanning|\bstp\b|portfast|bpdu|root guard|loop guard/i, 'stp'],
  [/wireless|wi.?fi|wlan|access point/i, 'wireless'],
  [/dhcp snooping|dynamic arp|\bdai\b|port security|security fundamentals|device security|\bacl\b|access control/i, 'security'],
  [/\bdhcp\b/i, 'dhcp'],
  [/\bdns\b/i, 'dns'],
  [/\bospf\b|\beigrp\b|\brip\b|routing|static route|packet path|life of a packet|\bfhrp\b|\bhsrp\b|\bvrf\b|\bgre\b|wan architecture/i, 'routing'],
  [/\bnat\b/i, 'nat'],
  [/automation|\bapi\b|json|xml|yaml|ansible|puppet|chef|terraform|software.?defined|\bsd[n]?\b|container|virtualization|cloud/i, 'automation'],
  [/\bsnmp\b|syslog|\bntp\b|\bssh\b|\bftp\b|\btftp\b|cdp|lldp|wireshark|flashcard|anki/i, 'services'],
  [/etherchannel|switch|ethernet|lan/i, 'ethernet'],
  [/device|connecting|network|meg[a]? lab/i, 'devices'],
];

const PROMPTS = [
  (topic) => `Which statement is directly relevant to ${topic}?`,
  (topic) => `A learner is reviewing ${topic}. Which fact should they choose?`,
  (topic) => `Which option best matches the lesson topic: ${topic}?`,
  (topic) => `A technician is studying ${topic}. Which statement is accurate for this topic?`,
  (topic) => `Which concept belongs with ${topic}?`,
  (topic) => `Which description would help explain ${topic} to a new learner?`,
  (topic) => `Which networking fact is most closely connected to ${topic}?`,
  (topic) => `A student takes notes on ${topic}. Which note is accurate?`,
  (topic) => `Which statement would you expect in a review of ${topic}?`,
  (topic) => `Which option correctly reflects a core idea in ${topic}?`,
  (topic) => `Which fact should an administrator know when working with ${topic}?`,
  (topic) => `Which statement is useful when troubleshooting ${topic}?`,
  (topic) => `Which description is consistent with the lesson on ${topic}?`,
  (topic) => `Which choice correctly identifies a principle of ${topic}?`,
  (topic) => `Which statement would be appropriate in a quiz about ${topic}?`,
  (topic) => `Which option best explains a key part of ${topic}?`,
  (topic) => `Which fact about ${topic} is accurate?`,
  (topic) => `Which statement is a good summary of ${topic}?`,
  (topic) => `Which choice is most relevant to configuring or understanding ${topic}?`,
  (topic) => `Which description matches the main idea of ${topic}?`,
];

const DISTRACTORS = [
  'It automatically encrypts every packet without keys or security configuration.',
  'It replaces IP addressing and routing on all networks.',
  'It guarantees unlimited bandwidth and zero packet loss during congestion.',
  'It forwards every packet across the internet using only the source MAC address.',
  'It gives every device a public IPv4 address without a server or address pool.',
  'It prevents all network attacks simply by being enabled.',
  'It converts every TCP connection into a UDP connection.',
  'It operates only at the physical layer and never processes protocol data.',
  'It makes a network function correctly without interfaces, links, or configuration.',
  'It assigns a unique 128-bit address to every Ethernet frame.',
  'It removes the need for switches, routers, and access points.',
  'It guarantees that every wireless client can communicate without authentication.',
];

function getTopicKey(title) {
  return TOPIC_MATCHERS.find(([pattern]) => pattern.test(title))?.[1] || 'devices';
}

function createSampleQuestions(title, count = 20) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError('Sample question count must be between 1 and 20.');
  }

  const topic = title
    .replace(/^\s*\d+\s*[-_. ]\s*/, '')
    .replace(/^Free CCNA\s*[|｜]\s*/i, '')
    .replace(/\s*[|｜]\s*Day\s+\d+.*$/i, '')
    .replace(/\s*[|｜]\s*CCNA.*$/i, '')
    .replace(/\s*[|｜]\s*/g, ' ')
    .trim();
  const facts = NETWORK_FACTS[getTopicKey(title)];
  const questions = [];

  for (let index = 0; index < count; index += 1) {
    const fact = facts[Math.floor(index / 4) % facts.length][index % 4];
    const options = [fact, ...Array.from({ length: 3 }, (_, choice) => DISTRACTORS[(index + choice * 4) % DISTRACTORS.length])];
    const correctIndex = (index * 7) % 4;
    const correctAnswer = options.shift();
    options.splice(correctIndex, 0, correctAnswer);
    questions.push({
      question: PROMPTS[index % PROMPTS.length](topic),
      options,
      correct_option: 'abcd'[correctIndex],
    });
  }

  return questions;
}

module.exports = { createSampleQuestions };
