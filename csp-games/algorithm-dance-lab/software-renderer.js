/* A small Canvas2D triangle rasterizer for the same Three.js rig when WebGL is disabled.
   It projects real 3D mesh vertices; it is not a prerecorded or 2D replacement animation. */
export function softwareRenderer(T,canvas){const ctx=canvas.getContext('2d');if(!ctx)throw Error('No graphics context is available.');let width=500,height=365;
 const cameraPoint=new T.Vector3(),world=[new T.Vector3(),new T.Vector3(),new T.Vector3()],projected=[new T.Vector3(),new T.Vector3(),new T.Vector3()],ab=new T.Vector3(),ac=new T.Vector3(),normal=new T.Vector3(),light=new T.Vector3(-.4,.8,1).normalize();
 const geometryCache=new WeakMap();
 return {domElement:canvas,setPixelRatio(){},setClearColor(){},setSize(w,h){width=w;height=h;canvas.width=w;canvas.height=h;},dispose(){ctx.clearRect(0,0,width,height);},render(scene,camera){
  ctx.fillStyle='#0c1722';ctx.fillRect(0,0,width,height);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.getWorldPosition(cameraPoint);const faces=[];
  scene.traverse(object=>{if(!object.isMesh||!object.visible)return;const geometry=object.geometry,attr=geometry.attributes.position;if(!attr)return;let tris=geometryCache.get(geometry);if(!tris){const index=geometry.index;tris=[];const count=index?index.count:attr.count;for(let i=0;i<count;i+=3)tris.push([0,1,2].map(j=>{const k=index?index.getX(i+j):i+j;return [attr.getX(k),attr.getY(k),attr.getZ(k)];}));geometryCache.set(geometry,tris);}
   for(const tri of tris){for(let i=0;i<3;i++){world[i].set(...tri[i]).applyMatrix4(object.matrixWorld);projected[i].copy(world[i]).project(camera);}
    if(projected.some(v=>v.z<-1||v.z>1))continue;ab.subVectors(world[1],world[0]);ac.subVectors(world[2],world[0]);normal.crossVectors(ab,ac).normalize();
    const center=world[0].clone().add(world[1]).add(world[2]).multiplyScalar(1/3);if(normal.dot(cameraPoint.clone().sub(center))<=0)continue;
    const brightness=object.material.isMeshBasicMaterial?1:.55+.45*Math.max(0,normal.dot(light));const color=object.material.color.clone().multiplyScalar(brightness).getStyle(T.SRGBColorSpace);
    faces.push({xy:projected.map(v=>[(v.x+1)*width/2,(1-v.y)*height/2]),depth:(projected[0].z+projected[1].z+projected[2].z)/3,color});
   }
  });faces.sort((a,b)=>b.depth-a.depth);for(const f of faces){ctx.beginPath();ctx.moveTo(...f.xy[0]);ctx.lineTo(...f.xy[1]);ctx.lineTo(...f.xy[2]);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.5;ctx.stroke();}
 }};
}
