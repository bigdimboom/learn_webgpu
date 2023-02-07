
import {vec3, vec4, mat3, mat4, quat, glMatrix} from 'gl-matrix'

export interface CameraInternal
{
    view : mat4;
    proj: mat4;
}

export class FreeLookCam implements CameraInternal
{
    public view: mat4;
    public proj: mat4;

    private _pos: vec3;
    private _up: vec3;
    private _dir: vec3;
    private _right: vec3;

    private _pitchRad : number;


    constructor(fov = glMatrix.toRadian(65), aspectRatio = 1, near = 0.01, far = 5000)
    {
        this.view = mat4.identity(mat4.create());
        this.proj = mat4.perspective(mat4.create(), fov, aspectRatio, near, far);

        this._pos = vec3.fromValues(0,0,0);
        this._up = vec3.fromValues(0,1,0);
        this._dir = vec3.fromValues(0,0,-1);
        this._right = vec3.cross(vec3.create(), this._dir, this._up);

        this._pitchRad = 0;
    }

    FromLookAt(eye: vec3, center: vec3, up: vec3 = vec3.fromValues(0,1,0)) : FreeLookCam
    {
        this._pos = eye;
        this._dir = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), center, eye));
        this._right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this._dir, up));
        this._up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this._right, this._dir));
        this.Update();
        
        return this;
    }

    SetViewMatrix(viewMat : mat4) : FreeLookCam
    {
        this.view = viewMat;
        return this;
    }

    SetPerspectiveProj(fov = glMatrix.toRadian(65), aspectRatio = 1, near = 0.01, far = 5000) : FreeLookCam
    {
        mat4.perspective(this.proj, fov, aspectRatio, near, far);
        return this;
    }

    SetProjectionMatrix(projMat : mat4)
    {
        this.proj = projMat;
    }

    GetView() : mat4
    {
        return this.view;
    }

    GetProj() : mat4
    {
        return this.proj;
    }

    MoveForward(val : number) : FreeLookCam
    {   
        vec3.scaleAndAdd(this._pos, this._pos, this._dir, val);
        return this;
    }

    MoveUp(val : number) : FreeLookCam
    {   
        vec3.scaleAndAdd(this._pos, this._pos, this._up, val);
        return this;
    }

    MoveRight(val : number) : FreeLookCam
    {   
        vec3.scaleAndAdd(this._pos, this._pos, this._right, val);
        return this;
    }

    Pitch(rad : number)
    {
        const q = quat.setAxisAngle(quat.create(), this._right, rad);
        const m = mat3.fromQuat(mat3.create(), q);
        
        vec3.normalize(this._dir, vec3.transformMat3(this._dir, this._dir, m));
        vec3.normalize(this._up, vec3.cross(this._up, this._right, this._dir));
        vec3.normalize(this._right, vec3.cross(this._right, this._dir, this._up));
    }

    Yaw(rad : number)
    {
        const q = quat.setAxisAngle(quat.create(), this._up, rad);
        const m = mat3.fromQuat(mat3.create(), q);

        vec3.normalize(this._dir, vec3.transformMat3(this._dir, this._dir, m));
        //vec3.normalize(this._right, vec3.cross(this._right, this._dir, this._up));
        vec3.normalize(this._right, vec3.cross(this._right, this._dir, vec3.fromValues(0,1,0))); // this prevents camera rolling
        vec3.normalize(this._up, vec3.cross(this._up, this._right, this._dir));
    }

    // return mvp matrix
    Update(model: mat4 = mat4.identity(mat4.create())) : void
    {
        mat4.lookAt(this.view, this._pos, vec3.add(vec3.create(), this._pos, this._dir), this._up);
    }

}