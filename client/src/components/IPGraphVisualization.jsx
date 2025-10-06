import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

// Terima handler onLinkClick
const IPGraphVisualization = ({ data, onNodeClick, onLinkClick, rootId }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);

    // Dapatkan dimensi kontainer secara dinamis
    const width = containerRef.current ? containerRef.current.clientWidth : 800;
    const height = containerRef.current ? containerRef.current.clientHeight : 500;

    useEffect(() => {
        d3.select(svgRef.current).selectAll("*").remove();

        if (!containerRef.current || !data || data.nodes.length === 0) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width === 0 || height === 0) return;

        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        const g = svg.append("g");

        // Skala Warna Kustom
        const colorMap = {
            'IMAGE': '#4CAF50', // Green
            'VIDEO': '#2196F3', // Blue
            'AUDIO': '#FF9800', // Orange
            'TEXT': '#9C27B0', // Purple
            'COLLECTION': '#E91E63', // Pink
            'UNKNOWN': '#607D8B', // Grey
            'ERROR': '#F44336', // Red
        };
        const getNodeColor = (d) => d.id === rootId ? '#FF3366' : colorMap[d.mediaType] || colorMap['UNKNOWN'];
        
        // --- 1. Definisi Arrow Marker (untuk Directed Graph) ---
        svg.append("defs").selectAll("marker")
            .data(["arrow"])
            .join("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20) 
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#666")
            .attr("d", "M0,-5L10,0L0,5");

        // Inisialisasi Force Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150)) 
            .force("charge", d3.forceManyBody().strength(-600)) 
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Buat Links
        const link = g.append("g")
            .attr("stroke", "#666")
            .attr("stroke-opacity", 0.8)
          .selectAll("line")
          .data(links)
          .join("line")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow)")
            .attr("class", "link")
            // ▼▼▼ Tambahkan Link Click Handler ▼▼▼
            .on("click", (event, d) => onLinkClick(d.target.id)) 
            .attr("cursor", "pointer");

        // Grup Node (lingkaran dan teks)
        const nodeGroup = g.append("g")
          .selectAll("g")
          .data(nodes)
          .join("g")
            .attr("class", "node-group")
            .call(drag(simulation))
            .on("click", (event, d) => onNodeClick(d.id))
            .on("mouseover", function(event, d) {
                // Highlight Neighbors (Implementasi D3.js Lanjutan)
                link.attr('opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1.0 : 0.1);
                d3.selectAll('.node-group').attr('opacity', n => (d.id === n.id || links.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id))) ? 1.0 : 0.3);

                // Tampilkan Tooltip
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`<strong>${d.title}</strong><br/>Type: ${d.mediaType}<br/>ID: ${d.id.substring(0, 12)}...`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                // Hapus Highlight
                link.attr('opacity', 0.8);
                d3.selectAll('.node-group').attr('opacity', 1.0);
                d3.select("#tooltip").style("opacity", 0);
            });

        // Lingkaran Node
        nodeGroup.append("circle")
            .attr("r", d => d.id === rootId ? 14 : 10) 
            .attr("fill", getNodeColor)
            .attr("stroke", "#eee")
            .attr("stroke-width", 2);

        // Label Node (di samping lingkaran)
        nodeGroup.append("text")
            .attr("font-size", 12)
            .attr("fill", "#ccc")
            .attr("x", 16)
            .attr("y", 4)
            .text(d => d.title.substring(0, 20) + (d.title.length > 20 ? '...' : ''));

        // Perbarui posisi pada setiap tick simulasi
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeGroup
                .attr("transform", d => `translate(${d.x}, ${d.y})`);
        });

        // ... (Penanganan Drag dan Zoom tetap sama)
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        function handleZoom(event) {
            g.attr("transform", event.transform);
        }

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", handleZoom);

        svg.call(zoom);

    }, [data, onNodeClick, onLinkClick, rootId]); // Tambahkan onLinkClick ke dependency array

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '70vh' }}>
            <svg ref={svgRef} className="block"></svg>
            {/* Tooltip HTML untuk D3 */}
                <div id="tooltip" className="absolute opacity-0 bg-gray-900 border border-purple-500 text-xs text-white p-2 rounded pointer-events-none transition-opacity duration-150 shadow-xl"></div>
            </div>
        );
            <div ref={containerRef} className="w-full h-[500px] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl border border-purple-900 shadow-2xl overflow-hidden animate-fade-in">
                <svg ref={svgRef} />
            </div>
};

export default IPGraphVisualization;