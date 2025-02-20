#!/bin/bash

# Display CPU information
echo "CPU Information:"
lscpu | grep -E '^Thread|^Core|^Socket|^Model name'
echo "--------------------------"

# Display Memory information
echo "Memory Information:"
free -h
echo "--------------------------"

# Display Storage information
echo "Storage Information:"
lsblk
echo "--------------------------"

# Display Network information
echo "Network Adapter Information:"
lspci | grep -i network
echo "--------------------------"
