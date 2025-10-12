import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const IPGraphVisualization = ({ data, onNodeClick, onLinkClick, rootId }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);

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

        // --- SKALA VISUAL BARU ---
        const maxRoyalties = d3.max(nodes, d => d.analytics?.totalRoyaltiesClaimed) || 1;
        const radiusScale = d3.scaleSqrt()
            .domain([0, maxRoyalties])
            .range([8, 30]); 

        const colorMap = {
            'IMAGE': '#4CAF50', 'VIDEO': '#2196F3', 'AUDIO': '#FF9800', 
            'TEXT': '#9C27B0', 'COLLECTION': '#E91E63', 'UNKNOWN': '#607D8B', 'ERROR': '#F44336'
        };
        const getNodeColor = (d) => d.id === rootId ? '#FFD700' : colorMap[d.mediaType] || colorMap['UNKNOWN'];
        
        // --- Drag Function Definition (DIPINDAHKAN KE SINI UNTUK MENGATASI ReferenceError) ---
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
            return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }
        
        // Definisi Arrow Marker (tetap sama)
        svg.append("defs").selectAll("marker")
            .data(["arrow"])
            .join("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 18) 
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#666")
            .attr("d", "M0,-5L10,0L0,5");

        // Inisialisasi Force Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(180)) 
            .force("charge", d3.forceManyBody().strength(-800)) 
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Buat Links
        const link = g.append("g")
            .attr("stroke", "#4A4A4A").attr("stroke-opacity", 0.6)
            .selectAll("line").data(links).join("line")
            .attr("stroke-width", 3).attr("marker-end", "url(#arrow)")
            .attr("class", "link transition-opacity duration-150")
            .on("click", (event, d) => onLinkClick(d.target.id)) 
            .attr("cursor", "pointer");

        // --- ANIMASI PARTIKEL PADA LINK (ALIRAN NILAI) ---
        const particles = [];
        links.forEach(link => {
            const targetNode = nodes.find(n => n.id === link.target.id);
            const royaltyRate = parseFloat(targetNode?.analytics?.royaltySplit) || 0;
            const numParticles = Math.ceil(royaltyRate / 5) + 1; 
            for (let i = 0; i < numParticles; i++) {
                particles.push({ link: link, progress: Math.random() });
            }
        });

        const particle = g.append("g")
            .selectAll(".particle").data(particles).enter()
            .append("circle").attr("r", 2).attr("fill", "#00f5d4"); 

        // Grup Node (lingkaran dan teks)
        const nodeGroup = g.append("g").selectAll("g").data(nodes).join("g")
            .attr("class", "node-group transition-all duration-300 ease-in-out")
            .call(drag(simulation)) // drag kini terdefinisi
            .on("click", (event, d) => onNodeClick(d.id))
            .on("mouseover", function(event, d) {
                
                link.attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1.0 : 0.1)
                    .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#B855FF' : '#4A4A4A');
                
                d3.selectAll('.node-group').attr('opacity', n => (d.id === n.id || links.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id))) ? 1.0 : 0.3);

                // Tampilkan Tooltip yang diperkaya data Real On-Chain
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.title}</strong><br/>
                        Type: ${d.mediaType}<br/>
                        ID: ${d.id.substring(0, 12)}...<br/>
                        Total Royalties: <strong>${d.analytics?.totalRoyaltiesClaimed?.toLocaleString() || 'N/A'}</strong>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function() {
                // Kembalikan ukuran dan warna node
                d3.select(this).select('circle').attr("r", d => radiusScale(d.analytics?.totalRoyaltiesClaimed || 0)); 
                d3.select(this).select('text').attr('font-weight', 'normal').attr('fill', '#ccc');
                
                // Hapus Highlight
                link.attr('stroke-opacity', 0.6).attr('stroke', '#4A4A4A');
                d3.selectAll('.node-group').attr('opacity', 1.0);
                d3.select("#tooltip").style("opacity", 0);
            });

        // Lingkaran Node dengan ukuran dinamis (berdasarkan total royalti)
        nodeGroup.append("circle")
            .attr("r", d => radiusScale(d.analytics?.totalRoyaltiesClaimed || 0))
            .attr("fill", getNodeColor)
            .attr("stroke", d => d.id === rootId ? '#FFF' : '#eee')
            .attr("stroke-width", d => d.id === rootId ? 3 : 2)
            .attr("cursor", "pointer");

        // Label Node
        nodeGroup.append("text")
            .attr("font-size", 12).attr("fill", "#ccc")
            .attr("x", d => radiusScale(d.analytics?.totalRoyaltiesClaimed || 0) + 5) 
            .attr("y", 4).text(d => d.title.substring(0, 25) + (d.title.length > 25 ? '...' : '')); 

        // Perbarui posisi pada setiap tick simulasi
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

            nodeGroup.attr("transform", d => `translate(${d.x}, ${d.y})`);

            // Update posisi partikel animasi
            particle.attr("transform", d => {
                const royaltyRate = parseFloat(d.link.target.analytics?.royaltySplit) || 0;
                const speed = 0.003 + (royaltyRate / 50000); 
                d.progress = (d.progress + speed) % 1;
                const x = d.link.source.x + (d.link.target.x - d.link.source.x) * d.progress;
                const y = d.link.source.y + (d.link.target.y - d.link.source.y) * d.progress;
                return `translate(${x},${y})`;
            });
        });
        
        function handleZoom(event) {
            g.attr("transform", event.transform);
        }

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", handleZoom);

        svg.call(zoom);

    }, [data, onNodeClick, onLinkClick, rootId]);

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '70vh' }}>
            <svg ref={svgRef} className="block"></svg>
            <div id="tooltip" className="absolute opacity-0 bg-gray-900 border border-purple-500 text-xs text-white p-2 rounded pointer-events-none transition-opacity duration-150 shadow-xl"></div>
        </div>
    );
};

export default IPGraphVisualization;