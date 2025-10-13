import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const IPGraphVisualization = ({ data, onNodeClick, rootId }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(); // Gunakan ref untuk menyimpan simulasi

    useEffect(() => {
        if (!containerRef.current || !data) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height]);
        
        // Buat grup utama jika belum ada
        let g = svg.select("g");
        if (g.empty()) {
            g = svg.append("g");
        }

        // Inisialisasi simulasi hanya sekali
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation()
                .force("link", d3.forceLink().id(d => d.id).distance(150).strength(0.5))
                .force("charge", d3.forceManyBody().strength(-600))
                .force("center", d3.forceCenter(0, 0))
                .force("x", d3.forceX().strength(0.05))
                .force("y", d3.forceY().strength(0.05))
                .on("tick", () => {
                    // Update posisi node dan link pada setiap tick
                    g.selectAll(".node").attr("transform", d => `translate(${d.x},${d.y})`);
                    g.selectAll(".link")
                        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
                });
            
            // Atur zoom
            svg.call(d3.zoom().extent([[0, 0], [width, height]]).scaleExtent([0.1, 8]).on("zoom", ({transform}) => {
                g.attr("transform", transform);
            }));
        }
        
        const simulation = simulationRef.current;

        // --- Data Binding ---
        const links = g.selectAll(".link").data(data.links, d => `${d.source.id}-${d.target.id}`);
        const nodes = g.selectAll(".node").data(data.nodes, d => d.id);

        // --- Hapus elemen lama ---
        links.exit().remove();
        nodes.exit().remove();

        // --- Tambah elemen baru untuk link ---
        links.enter().append("line")
            .attr("class", "link")
            .attr("stroke", "#4A4A4A")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 2);

        // --- Tambah grup baru untuk node ---
        const nodeGroup = nodes.enter().append("g")
            .attr("class", "node")
            .attr("cursor", "pointer")
            .on("click", (event, d) => onNodeClick(d))
            .call(drag(simulation));

        nodeGroup.append("circle")
            .attr("r", 22)
            .attr("fill", d => d.id === rootId ? '#FFD700' : '#5A429C')
            .attr("class", d => d.id === rootId ? 'animate-pulse' : '')
            .attr("fill-opacity", 0.3);

        nodeGroup.append("circle")
            .attr("r", 18)
            .attr("fill", "#1E1B33")
            .attr("stroke", d => d.id === rootId ? '#FFD700' : '#8A63D2')
            .attr("stroke-width", 2);
            
        nodeGroup.append("path")
            .attr("d", d => {
                switch (d.mediaType) {
                    case 'IMAGE': return "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z";
                    case 'VIDEO': return "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z";
                    case 'AUDIO': return "M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z";
                    default: return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z";
                }
            })
            .attr("transform", "translate(-12, -12)")
            .attr("fill", "#E0D5FF");

        nodeGroup.append("text")
            .attr("x", 26)
            .attr("y", "0.31em")
            .text(d => (d.title || 'Untitled').substring(0, 18) + ((d.title || '').length > 18 ? '...' : ''))
            .attr("fill", "#ccc")
            .attr("font-size", "12px")
            .attr("stroke", "#111")
            .attr("stroke-width", 0.3)
            .attr("paint-order", "stroke");

        // Update simulasi dengan data baru
        simulation.nodes(data.nodes);
        simulation.force("link").links(data.links);
        simulation.alpha(0.3).restart(); // Beri "tendangan" agar node baru bergerak

        // Fungsi Drag and Drop
        function drag(simulation) {
            function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
            function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
            function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
            return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }

    }, [data, onNodeClick, rootId]); // Hanya jalankan ulang saat data berubah

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '70vh' }}>
            <svg ref={svgRef} className="block"></svg>
        </div>
    );
};

export default IPGraphVisualization;