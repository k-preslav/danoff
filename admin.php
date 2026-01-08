<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

$file = 'users.txt';

if(!file_exists($file)){
    file_put_contents($file, json_encode([]));
}

$data = json_decode(file_get_contents($file), true);

if(isset($_GET['check'])){
    $uid = $_GET['check'];
    $found = false;
    $allowed = false;
    
    foreach($data as $u){
        if($u['id'] == $uid){
            $found = true;
            $allowed = $u['allowed'];
            break;
        }
    }
    
    if(!$found){
        $data[] = [
            "id" => $uid,
            "name" => "new user",
            "allowed" => false
        ];
        file_put_contents($file, json_encode($data));
    }
    
    echo json_encode(["allowed" => $allowed]);
    exit;
}

if(isset($_POST['id'])){
    $id = $_POST['id'];
    $act = $_POST['act'];
    
    foreach($data as &$u){
        if($u['id'] == $id){
            if($act == "toggle") $u['allowed'] = !$u['allowed'];
            if($act == "rename") $u['name'] = $_POST['name'];
            if($act == "del") {
            }
        }
    }

    if($act == "del"){
        $data = array_filter($data, function($u) use ($id) { return $u['id'] != $id; });
    }
    
    file_put_contents($file, json_encode(array_values($data)));
    header("Location: admin.php");
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Danoff Admin</title>
    <style>
        body { font-family: sans-serif; background: #eee; padding: 20px; }
        table { background: white; width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
        .btn { padding: 5px 10px; cursor: pointer; border: none; border-radius: 3px; }
        .green { background: #4CAF50; color: white; }
        .red { background: #f44336; color: white; }
        .blue { background: #2196F3; color: white; }
    </style>
</head>
<body>

<h2>Users List</h2>

<table>
    <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Status</th>
        <th>Action</th>
    </tr>
    <?php foreach($data as $u): ?>
    <tr>
        <td><?php echo $u['id']; ?></td>
        <td>
            <form method="POST" style="display:inline;">
                <input type="hidden" name="id" value="<?php echo $u['id']; ?>">
                <input type="hidden" name="act" value="rename">
                <input type="text" name="name" value="<?php echo $u['name']; ?>">
                <button class="btn blue">save</button>
            </form>
        </td>
        <td>
            <?php echo $u['allowed'] ? '<b style="color:green">active</b>' : '<b style="color:red">blocked</b>'; ?>
        </td>
        <td>
            <form method="POST" style="display:inline;">
                <input type="hidden" name="id" value="<?php echo $u['id']; ?>">
                <input type="hidden" name="act" value="toggle">
                <button class="btn <?php echo $u['allowed'] ? 'red' : 'green'; ?>">
                    <?php echo $u['allowed'] ? 'block' : 'allow'; ?>
                </button>
            </form>
            
            <form method="POST" style="display:inline;">
                <input type="hidden" name="id" value="<?php echo $u['id']; ?>">
                <input type="hidden" name="act" value="del">
                <button class="btn red" onclick="return confirm('r u sure?')">delete</button>
            </form>
        </td>
    </tr>
    <?php endforeach; ?>
</table>

</body>
</html>
